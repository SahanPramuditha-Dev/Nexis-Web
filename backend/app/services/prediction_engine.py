from datetime import datetime
from typing import List
from app.models import (
    EnvironmentInput, 
    PredictionOutput, 
    AttenuationBreakdown, 
    DiagnoseInput, 
    DiagnoseOutput
)
from app.services.rf_physics import (
    calculate_rssi_and_snr,
    get_modulation_efficiency,
    get_time_of_day_congestion_penalty,
    get_device_efficiency,
    FREQUENCY_MAP
)
from app.services.weather_service import get_live_weather_impact


async def predict_network_performance(env: EnvironmentInput) -> PredictionOutput:
    # 1. Resolve Time of Day
    hour = env.time_of_day_hour if env.time_of_day_hour is not None else datetime.now().hour
    congestion_penalty = get_time_of_day_congestion_penalty(hour)

    # 2. Weather Impact
    weather_loss_db = 0.0
    if not env.is_indoor or env.connection_type in ["5G_MMWAVE", "5G_SUB6", "LTE"]:
        weather_info = await get_live_weather_impact(env.latitude, env.longitude, env.distance_meters)
        freq_key = "5G_mmWave" if env.connection_type == "5G_MMWAVE" else "5GHz"
        weather_loss_db = weather_info.attenuation_db.get(freq_key, 0.0)

    # 3. RF Signal & Attenuation
    rssi, snr, dist_loss, obs_loss = calculate_rssi_and_snr(
        connection_type=env.connection_type,
        distance_m=env.distance_meters,
        obstacles=env.obstacles,
        weather_loss_db=weather_loss_db,
        is_indoor=env.is_indoor
    )
    total_loss = dist_loss + obs_loss + weather_loss_db

    # 4. Efficiencies
    mod_eff = get_modulation_efficiency(snr)
    dev_eff = get_device_efficiency(env.device_tier)
    net_capacity_factor = (1.0 - congestion_penalty)

    # 5. Throughput Predictions
    # Throughput is scaled by the combined physical and network bottlenecks
    effective_throughput_ratio = mod_eff * net_capacity_factor * dev_eff
    pred_dl = round(env.base_speed_mbps * effective_throughput_ratio, 2)
    # Ensure minimum plausible throughput if connected
    pred_dl = max(0.5 if snr > 2.0 else 0.0, pred_dl)

    # Uplink estimation (typically 30%-80% of downlink depending on link technology)
    up_ratio = 0.9 if "WIFI" in env.connection_type else 0.35
    pred_ul = round(pred_dl * up_ratio, 2)

    # 6. Latency & Jitter Estimation
    base_latency = 8.0 if "WIFI" in env.connection_type else 22.0
    # Low SNR increases retransmissions
    retrans_penalty = 0.0
    if snr < 15.0:
        retrans_penalty = (15.0 - snr) * 2.5
    # Peak congestion queuing delay
    queue_delay = congestion_penalty * 20.0
    pred_latency = round(base_latency + retrans_penalty + queue_delay, 1)

    # 7. Signal Quality Classification
    if rssi >= -60:
        sig_qual = "Excellent"
    elif rssi >= -72:
        sig_qual = "Good"
    elif rssi >= -82:
        sig_qual = "Fair"
    elif rssi >= -90:
        sig_qual = "Poor"
    else:
        sig_qual = "Disconnected"

    # 8. Dynamic Bottleneck Analysis
    bottlenecks: List[str] = []
    recommendations: List[str] = []

    if obs_loss >= 12.0:
        bottlenecks.append(f"Obstacle barrier absorption: {obs_loss:.1f} dB lost across physical walls/structures.")
        recommendations.append("Consider an Ethernet cable, MoCA adapter, or mesh node to bypass dense masonry/concrete walls.")

    if dist_loss >= 60.0:
        bottlenecks.append(f"Distance attenuation: {dist_loss:.1f} dB path loss at {env.distance_meters:.1f} meters.")
        recommendations.append(f"Relocate closer to the access point or antenna line-of-sight to recover high-order modulation (MCS).")

    if congestion_penalty >= 0.25:
        bottlenecks.append(f"Peak hour ISP/Node congestion ({hour:02d}:00): capacity reduced by {int(congestion_penalty*100)}%.")
        recommendations.append("Schedule massive file downloads or cloud backups outside of peak hours (7 PM - 11 PM).")

    if dev_eff < 0.60:
        bottlenecks.append("Device limitation: 1x1 SISO radio hardware caps maximum simultaneous spatial streams.")
        recommendations.append("Upgrade client Wi-Fi adapter or device to at least 2x2 MIMO Wi-Fi 6 for 2x throughput gains.")

    if snr < 14.0 and "WIFI" in env.connection_type:
        bottlenecks.append(f"Low Signal-to-Noise Ratio ({snr:.1f} dB): forced fallback to low-order modulation (QPSK/16-QAM).")
        recommendations.append("Switch to 2.4 GHz if range is the priority, or 5 GHz with closer proximity for max speed.")

    if weather_loss_db > 2.0:
        bottlenecks.append(f"Atmospheric rain fade: {weather_loss_db:.1f} dB loss due to active precipitation.")
        recommendations.append("Outdoor wireless link is affected by rain fade; performance will normalize once precipitation clears.")

    if not bottlenecks:
        bottlenecks.append("No significant environmental bottlenecks detected; link is performing near theoretical capacity.")
        recommendations.append("Current physical position and network conditions are optimal.")

    return PredictionOutput(
        predicted_download_mbps=pred_dl,
        predicted_upload_mbps=pred_ul,
        predicted_latency_ms=pred_latency,
        estimated_rssi_dbm=rssi,
        estimated_snr_db=snr,
        signal_quality=sig_qual,
        attenuation_breakdown=AttenuationBreakdown(
            distance_loss_db=dist_loss,
            obstacle_loss_db=obs_loss,
            weather_loss_db=round(weather_loss_db, 2),
            total_loss_db=round(total_loss, 2)
        ),
        congestion_impact_pct=round(congestion_penalty * 100, 1),
        device_efficiency_pct=round(dev_eff * 100, 1),
        bottlenecks=bottlenecks,
        recommendations=recommendations
    )


async def diagnose_measurement(diag: DiagnoseInput) -> DiagnoseOutput:
    prediction = await predict_network_performance(diag.environment)
    expected_dl = prediction.predicted_download_mbps
    measured_dl = diag.measured_download_mbps

    deficit_pct = 0.0
    if expected_dl > 0:
        deficit_pct = round(max(0.0, (expected_dl - measured_dl) / expected_dl * 100.0), 1)

    primary = "None"
    score = "Optimal"
    findings: List[str] = []
    actions: List[str] = []

    if deficit_pct > 50.0:
        score = "Severe Underperformance"
        primary = "Severe Local Link or ISP Bottleneck"
        findings.append(f"Measured speed ({measured_dl:.1f} Mbps) is {deficit_pct}% lower than the environmentally-adjusted baseline ({expected_dl:.1f} Mbps).")
        findings.extend(prediction.bottlenecks)
        actions.append("Check for background downloads, cloud backups, or malware on local network devices.")
        actions.append("Restart the modem/router to clear memory leaks and re-negotiate DSL/Fiber link synchronization.")
        actions.extend(prediction.recommendations)
    elif deficit_pct > 20.0:
        score = "Moderate Degradation"
        primary = prediction.bottlenecks[0] if prediction.bottlenecks else "Minor Contention"
        findings.append(f"Performance is slightly degraded ({deficit_pct}% below predicted baseline).")
        findings.extend(prediction.bottlenecks)
        actions.extend(prediction.recommendations)
    else:
        score = "Within Expected Variance"
        primary = "Operating Normally"
        findings.append(f"Measured speed ({measured_dl:.1f} Mbps) aligns closely with environmental predictions ({expected_dl:.1f} Mbps).")
        findings.append(f"Signal attenuation and network conditions are properly accounted for.")
        actions.append("Your setup is delivering the expected performance for your current distance and physical environment.")

    return DiagnoseOutput(
        expected_download_mbps=expected_dl,
        measured_download_mbps=measured_dl,
        deficit_pct=deficit_pct,
        primary_bottleneck=primary,
        performance_score=score,
        detailed_findings=findings,
        action_items=actions
    )

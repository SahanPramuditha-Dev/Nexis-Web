import math
from typing import Dict, List, Tuple
from app.models import ObstacleItem


# Center frequencies in GHz
FREQUENCY_MAP: Dict[str, float] = {
    "WIFI_2_4": 2.4,
    "WIFI_5": 5.2,
    "WIFI_6": 5.8,
    "WIFI_7": 6.2,
    "LTE": 1.8,
    "5G_SUB6": 3.5,
    "5G_MMWAVE": 28.0,
}

# Base transmit powers (EIRP in dBm)
TX_POWER_MAP: Dict[str, float] = {
    "WIFI_2_4": 20.0,
    "WIFI_5": 23.0,
    "WIFI_6": 23.0,
    "WIFI_7": 23.0,
    "LTE": 43.0,
    "5G_SUB6": 46.0,
    "5G_MMWAVE": 48.0,
}

# Material attenuation per single barrier (in dB) at ~2.4–5 GHz baseline
MATERIAL_ATTENUATION_BASE: Dict[str, float] = {
    "drywall": 3.2,
    "wood": 4.5,
    "glass": 3.0,
    "brick": 10.5,
    "concrete": 15.0,
    "metal": 24.0,
}


def calculate_frequency_scaled_material_loss(material: str, freq_ghz: float) -> float:
    base = MATERIAL_ATTENUATION_BASE.get(material.lower(), 4.0)
    # Higher frequencies (like 5G mmWave or 6GHz) face higher absorption
    scale = (freq_ghz / 2.4) ** 0.3
    return base * scale


def calculate_free_space_path_loss(distance_m: float, freq_ghz: float, is_indoor: bool = True) -> float:
    d = max(0.5, distance_m)
    # Standard FSPL formula at reference d0 = 1m
    # FSPL(1m, f_GHz) = 20*log10(1) + 20*log10(f_GHz) + 32.44
    fspl_1m = 20 * math.log10(max(0.1, freq_ghz)) + 32.44
    
    # Path loss exponent n: 2.0 (free space), 2.8 - 3.2 (indoor residential / office)
    n = 3.0 if is_indoor else 2.2
    
    # Log-distance path loss: PL(d) = PL(d0) + 10 * n * log10(d / d0)
    loss = fspl_1m + 10 * n * math.log10(d)
    return round(max(0.0, loss), 2)


def calculate_obstacle_loss(obstacles: List[ObstacleItem], freq_ghz: float) -> float:
    total_loss = 0.0
    for obs in obstacles:
        per_barrier = calculate_frequency_scaled_material_loss(obs.material, freq_ghz)
        total_loss += per_barrier * obs.count
    return round(total_loss, 2)


def calculate_rssi_and_snr(
    connection_type: str, 
    distance_m: float, 
    obstacles: List[ObstacleItem], 
    weather_loss_db: float = 0.0,
    is_indoor: bool = True
) -> Tuple[float, float, float, float]:
    freq_ghz = FREQUENCY_MAP.get(connection_type, 5.0)
    tx_power = TX_POWER_MAP.get(connection_type, 20.0)
    
    dist_loss = calculate_free_space_path_loss(distance_m, freq_ghz, is_indoor)
    obs_loss = calculate_obstacle_loss(obstacles, freq_ghz)
    total_loss = dist_loss + obs_loss + weather_loss_db
    
    rssi = tx_power - total_loss
    # Thermal noise floor ~ -95 dBm for 20MHz Wi-Fi channel
    noise_floor = -95.0
    snr = max(0.0, rssi - noise_floor)
    
    return round(rssi, 1), round(snr, 1), dist_loss, obs_loss


def get_modulation_efficiency(snr_db: float) -> float:
    """Estimates percentage of theoretical link speed achievable given SNR."""
    if snr_db >= 32.0:
        return 1.0        # 1024-QAM / 4096-QAM optimal link
    elif snr_db >= 25.0:
        return 0.88       # 256-QAM
    elif snr_db >= 18.0:
        return 0.70       # 64-QAM
    elif snr_db >= 12.0:
        return 0.45       # 16-QAM
    elif snr_db >= 6.0:
        return 0.22       # QPSK
    elif snr_db > 2.0:
        return 0.08       # BPSK / Robust Fallback
    else:
        return 0.02       # Extreme packet drop / disassociation


def get_time_of_day_congestion_penalty(hour: int) -> float:
    """Returns the congestion factor (0.0 to 0.40) based on diurnal ISP traffic patterns."""
    # Peak evening hours (19:00 - 23:00)
    if 19 <= hour <= 23:
        # Peak peak at 20:00 - 21:30
        if 20 <= hour <= 21:
            return 0.35
        return 0.25
    # Afternoon / early evening (16:00 - 18:59)
    elif 16 <= hour < 19:
        return 0.15
    # Standard business hours (09:00 - 15:59)
    elif 9 <= hour < 16:
        return 0.10
    # Late night / early morning off-peak (00:00 - 07:00)
    else:
        return 0.02


def get_device_efficiency(device_tier: str) -> float:
    tier = device_tier.upper()
    if "LOW" in tier or "SISO" in tier:
        return 0.48   # 1x1 antenna, budget Wi-Fi/LTE modem
    elif "MID" in tier:
        return 0.85   # 2x2 MIMO modern mid-tier smartphone/laptop
    else:
        return 1.00   # Flagship 2x2/4x4, Wi-Fi 6E/7, advanced DSP

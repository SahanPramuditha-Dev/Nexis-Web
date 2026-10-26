/**
 * NEXIS Environmental & RF Telemetry Client Service
 * Connects frontend to the Python FastAPI backend (/api/predict, /api/weather, /api/diagnose)
 * Includes graceful client-side heuristic fallback if the backend service is offline.
 */

export interface ObstacleItem {
  material: 'drywall' | 'wood' | 'brick' | 'concrete' | 'metal' | 'glass'
  count: number
}

export interface EnvironmentInput {
  connection_type: 'WIFI_2_4' | 'WIFI_5' | 'WIFI_6' | 'WIFI_7' | 'LTE' | '5G_SUB6' | '5G_MMWAVE'
  base_speed_mbps: number
  distance_meters: number
  obstacles: ObstacleItem[]
  device_tier: 'LOW_SISO' | 'MID_MIMO' | 'FLAGSHIP'
  time_of_day_hour?: number
  is_indoor?: boolean
  latitude?: number
  longitude?: number
}

export interface AttenuationBreakdown {
  distance_loss_db: number
  obstacle_loss_db: number
  weather_loss_db: number
  total_loss_db: number
}

export interface PredictionOutput {
  predicted_download_mbps: number
  predicted_upload_mbps: number
  predicted_latency_ms: number
  estimated_rssi_dbm: number
  estimated_snr_db: number
  signal_quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Disconnected'
  attenuation_breakdown: AttenuationBreakdown
  congestion_impact_pct: number
  device_efficiency_pct: number
  bottlenecks: string[]
  recommendations: string[]
}

export interface WeatherImpactOutput {
  latitude: number
  longitude: number
  temperature_c: number
  humidity_pct: number
  precipitation_mm: number
  condition_description: string
  attenuation_db: Record<string, number>
  impact_level: string
  advisory: string
}

export interface DiagnoseInput {
  measured_download_mbps: number
  measured_latency_ms: number
  measured_loss_pct: number
  measured_jitter_ms?: number
  environment: EnvironmentInput
}

export interface DiagnoseOutput {
  expected_download_mbps: number
  measured_download_mbps: number
  deficit_pct: number
  primary_bottleneck: string
  performance_score: string
  detailed_findings: string[]
  action_items: string[]
}

// Baseline fallback in case backend is offline
function clientSideFallbackPredict(env: EnvironmentInput): PredictionOutput {
  const d = Math.max(0.5, env.distance_meters)
  // Distance loss approximation
  const distLoss = Math.round((20 * Math.log10(5) + 32.44 + 30 * Math.log10(d)) * 10) / 10
  
  const materialLossMap: Record<string, number> = {
    drywall: 3.2,
    wood: 4.5,
    glass: 3.0,
    brick: 10.5,
    concrete: 15.0,
    metal: 24.0,
  }

  let obsLoss = 0
  env.obstacles.forEach((o) => {
    obsLoss += (materialLossMap[o.material] || 4.0) * o.count
  })
  obsLoss = Math.round(obsLoss * 10) / 10

  const totalLoss = Math.round((distLoss + obsLoss) * 10) / 10
  const rssi = Math.round((23.0 - totalLoss) * 10) / 10
  const snr = Math.max(0, Math.round((rssi - -95.0) * 10) / 10)

  let modEff = 0.85
  if (snr >= 30) modEff = 1.0
  else if (snr >= 22) modEff = 0.85
  else if (snr >= 15) modEff = 0.60
  else if (snr >= 8) modEff = 0.30
  else modEff = 0.08

  const devEff = env.device_tier === 'LOW_SISO' ? 0.48 : env.device_tier === 'MID_MIMO' ? 0.85 : 1.0
  const hour = env.time_of_day_hour ?? new Date().getHours()
  const congestion = (hour >= 19 && hour <= 23) ? 0.30 : (hour >= 16 && hour < 19) ? 0.15 : 0.05

  const predDl = Math.max(0.5, Math.round(env.base_speed_mbps * modEff * (1 - congestion) * devEff * 10) / 10)
  const predUl = Math.round(predDl * 0.7 * 10) / 10
  const predLat = Math.round((10 + (snr < 15 ? (15 - snr) * 2 : 0) + congestion * 20) * 10) / 10

  const quality = rssi >= -60 ? 'Excellent' : rssi >= -72 ? 'Good' : rssi >= -82 ? 'Fair' : rssi >= -90 ? 'Poor' : 'Disconnected'

  const bottlenecks: string[] = []
  const recommendations: string[] = []

  if (obsLoss > 10) {
    bottlenecks.push(`Obstacle barrier absorption: ${obsLoss} dB lost across physical walls/structures.`)
    recommendations.push('Consider an Ethernet cable, MoCA adapter, or mesh node to bypass dense masonry walls.')
  }
  if (distLoss > 60) {
    bottlenecks.push(`Distance attenuation: ${distLoss} dB path loss at ${env.distance_meters}m.`)
    recommendations.push('Relocate closer to the access point or antenna line-of-sight to recover high-order modulation.')
  }
  if (congestion >= 0.25) {
    bottlenecks.push(`Peak hour ISP/Node congestion (${hour}:00): capacity reduced by ~${Math.round(congestion * 100)}%.`)
    recommendations.push('Schedule large data backups outside peak hours (7 PM - 11 PM).')
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push('No significant environmental bottlenecks detected; operating near nominal line speed.')
    recommendations.push('Current environment and distance are optimal.')
  }

  return {
    predicted_download_mbps: predDl,
    predicted_upload_mbps: predUl,
    predicted_latency_ms: predLat,
    estimated_rssi_dbm: rssi,
    estimated_snr_db: snr,
    signal_quality: quality,
    attenuation_breakdown: {
      distance_loss_db: distLoss,
      obstacle_loss_db: obsLoss,
      weather_loss_db: 0,
      total_loss_db: totalLoss,
    },
    congestion_impact_pct: Math.round(congestion * 100),
    device_efficiency_pct: Math.round(devEff * 100),
    bottlenecks,
    recommendations,
  }
}

export async function fetchLiveWeather(
  lat: number = 6.9271,
  lon: number = 79.8612,
  distanceM: number = 10
): Promise<WeatherImpactOutput> {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&distance_m=${distanceM}`)
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend weather API unavailable, falling back:', err)
  }

  return {
    latitude: lat,
    longitude: lon,
    temperature_c: 28.5,
    humidity_pct: 76.0,
    precipitation_mm: 0.0,
    condition_description: 'Clear sky (Offline Fallback)',
    attenuation_db: {
      '2.4GHz': 0.0,
      '5GHz': 0.01,
      '5G_Sub6': 0.02,
      '5G_mmWave': 0.1,
    },
    impact_level: 'Negligible',
    advisory: 'Nominal atmospheric conditions. Atmospheric attenuation is negligible.',
  }
}

export async function predictEnvironmentalSpeed(env: EnvironmentInput): Promise<PredictionOutput> {
  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend predict API unavailable, using client heuristic:', err)
  }

  return clientSideFallbackPredict(env)
}

export async function diagnoseSpeedDiscrepancy(diag: DiagnoseInput): Promise<DiagnoseOutput> {
  try {
    const res = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diag),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Backend diagnose API unavailable, using fallback:', err)
  }

  const pred = clientSideFallbackPredict(diag.environment)
  const deficit = Math.round(Math.max(0, (pred.predicted_download_mbps - diag.measured_download_mbps) / pred.predicted_download_mbps * 100))

  return {
    expected_download_mbps: pred.predicted_download_mbps,
    measured_download_mbps: diag.measured_download_mbps,
    deficit_pct: deficit,
    primary_bottleneck: pred.bottlenecks[0] || 'Unknown',
    performance_score: deficit > 40 ? 'Degraded' : 'Acceptable',
    detailed_findings: pred.bottlenecks,
    action_items: pred.recommendations,
  }
}

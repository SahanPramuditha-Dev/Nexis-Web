import { useState, useEffect } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import TuneRounded from '@mui/icons-material/TuneRounded'
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded'
import ThunderstormRounded from '@mui/icons-material/ThunderstormRounded'
import RouterRounded from '@mui/icons-material/RouterRounded'
import SpeedRounded from '@mui/icons-material/SpeedRounded'
import SignalCellularAltRounded from '@mui/icons-material/SignalCellularAltRounded'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import SmartphoneRounded from '@mui/icons-material/SmartphoneRounded'
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import LightbulbRounded from '@mui/icons-material/LightbulbRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'

import {
  predictEnvironmentalSpeed,
  fetchLiveWeather,
  type EnvironmentInput,
  type PredictionOutput,
  type WeatherImpactOutput,
  type ObstacleItem,
} from '@/data/environmentalService'

interface EnvironmentalPredictorModalProps {
  isOpen: boolean
  onClose: () => void
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function EnvironmentalPredictorModal({
  isOpen,
  onClose,
  onAddLog,
}: EnvironmentalPredictorModalProps) {
  // Inputs
  const [connectionType, setConnectionType] = useState<EnvironmentInput['connection_type']>('WIFI_5')
  const [baseSpeed, setBaseSpeed] = useState<number>(100)
  const [distanceM, setDistanceM] = useState<number>(8)
  const [deviceTier, setDeviceTier] = useState<EnvironmentInput['device_tier']>('MID_MIMO')
  const [timeHour, setTimeHour] = useState<number>(new Date().getHours())
  const [isIndoor, setIsIndoor] = useState<boolean>(true)
  const [obstacles, setObstacles] = useState<ObstacleItem[]>([
    { material: 'concrete', count: 1 },
  ])

  // Results & Weather
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null)
  const [weather, setWeather] = useState<WeatherImpactOutput | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  // Check health and run prediction
  const runPrediction = async () => {
    setLoading(true)
    try {
      // Check backend health
      try {
        const hRes = await fetch('/api/health')
        setBackendOnline(hRes.ok)
      } catch {
        setBackendOnline(false)
      }

      const w = await fetchLiveWeather(6.9271, 79.8612, distanceM)
      setWeather(w)

      const pred = await predictEnvironmentalSpeed({
        connection_type: connectionType,
        base_speed_mbps: baseSpeed,
        distance_meters: distanceM,
        obstacles,
        device_tier: deviceTier,
        time_of_day_hour: timeHour,
        is_indoor: isIndoor,
      })
      setPrediction(pred)

      if (onAddLog) {
        onAddLog(
          `Environmental Prediction: ${pred.predicted_download_mbps} Mbps expected at ${distanceM}m (RSSI: ${pred.estimated_rssi_dbm} dBm)`,
          'info'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      runPrediction()
    }
  }, [isOpen, connectionType, baseSpeed, distanceM, deviceTier, timeHour, obstacles, isIndoor])

  if (!isOpen) return null

  const addObstacle = (material: ObstacleItem['material']) => {
    setObstacles((prev) => {
      const existing = prev.find((o) => o.material === material)
      if (existing) {
        return prev.map((o) => (o.material === material ? { ...o, count: o.count + 1 } : o))
      }
      return [...prev, { material, count: 1 }]
    })
  }

  const removeObstacle = (material: ObstacleItem['material']) => {
    setObstacles((prev) =>
      prev
        .map((o) => (o.material === material ? { ...o, count: o.count - 1 } : o))
        .filter((o) => o.count > 0)
    )
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              }}
            >
              <TuneRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">
                  Environmental & RF Context Simulator
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  PHYSICS & ML ENGINE
                </span>
                {backendOnline !== null && (
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      backendOnline
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {backendOnline ? 'PYTHON FASTAPI ONLINE' : 'CLIENT HEURISTIC MODE'}
                  </span>
                )}
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Models distance path loss, wall materials, diurnal peak congestion, weather rain fade & device constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-surface-hover)] transition-colors text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]"
          >
            <CloseRounded sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Environmental Controls */}
            <div className="lg:col-span-6 space-y-5">
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-4">
                <h3 className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase tracking-wider flex items-center gap-2">
                  <RouterRounded sx={{ fontSize: 16, color: '#3B82F6' }} /> Link & Baseline Parameters
                </h3>

                {/* Connection Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--on-surface-muted)]">Radio Technology</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'WIFI_5', label: 'Wi-Fi 5 (5GHz)' },
                      { id: 'WIFI_6', label: 'Wi-Fi 6/6E' },
                      { id: 'WIFI_2_4', label: 'Wi-Fi 2.4GHz' },
                      { id: '5G_SUB6', label: '5G Sub-6' },
                      { id: '5G_MMWAVE', label: '5G mmWave' },
                      { id: 'LTE', label: '4G LTE' },
                    ].map((tech) => (
                      <button
                        key={tech.id}
                        onClick={() => setConnectionType(tech.id as any)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          connectionType === tech.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm'
                            : 'border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--on-surface-muted)]'
                        }`}
                      >
                        {tech.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan Base Speed */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--on-surface-muted)]">Subscribed ISP Plan Speed</span>
                    <span className="font-mono font-bold text-blue-400">{baseSpeed} Mbps</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={baseSpeed}
                    onChange={(e) => setBaseSpeed(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Distance Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[var(--on-surface-muted)]">Distance from Router / Access Point</span>
                    <span className="font-mono font-bold text-blue-400">{distanceM} meters</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={distanceM}
                    onChange={(e) => setDistanceM(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--on-surface-muted)]">
                    <span>1m (Same Room)</span>
                    <span>15m (Across House)</span>
                    <span>40m (Yard / Far Edge)</span>
                  </div>
                </div>
              </div>

              {/* Physical Barriers / Obstacles */}
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-3">
                <h3 className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase tracking-wider flex items-center justify-between">
                  <span>Physical Barriers & Walls</span>
                  <span className="text-[10px] text-blue-400">Total dB absorption</span>
                </h3>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'drywall', label: 'Drywall (3 dB)' },
                    { id: 'wood', label: 'Wood Door (4.5 dB)' },
                    { id: 'brick', label: 'Brick (10.5 dB)' },
                    { id: 'concrete', label: 'Concrete (15 dB)' },
                    { id: 'glass', label: 'Glass Window (3 dB)' },
                    { id: 'metal', label: 'Metal Shield (24 dB)' },
                  ].map((mat) => (
                    <button
                      key={mat.id}
                      onClick={() => addObstacle(mat.id as any)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-1.5 text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] transition-colors"
                    >
                      <AddCircleOutlineRounded sx={{ fontSize: 14 }} />
                      {mat.label}
                    </button>
                  ))}
                </div>

                {obstacles.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    {obstacles.map((obs) => (
                      <div
                        key={obs.material}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/10 border border-[var(--border-subtle)] text-xs"
                      >
                        <span className="font-semibold capitalize text-[var(--on-surface)]">
                          {obs.material} Wall
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-blue-400 font-bold">
                            × {obs.count}
                          </span>
                          <button
                            onClick={() => removeObstacle(obs.material)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/10"
                          >
                            <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--on-surface-muted)] italic">
                    Line-of-Sight (LoS) — No barrier obstructions added.
                  </p>
                )}
              </div>

              {/* Device Tier & Temporal Time */}
              <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Device Tier */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--on-surface-muted)] flex items-center gap-1.5">
                      <SmartphoneRounded sx={{ fontSize: 14, color: '#3B82F6' }} /> Device Radio Tier
                    </label>
                    <select
                      value={deviceTier}
                      onChange={(e) => setDeviceTier(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface)]"
                    >
                      <option value="LOW_SISO">Budget 1x1 SISO (-52%)</option>
                      <option value="MID_MIMO">Mid-range 2x2 MIMO (-15%)</option>
                      <option value="FLAGSHIP">Flagship 4x4 / Wi-Fi 7 (100%)</option>
                    </select>
                  </div>

                  {/* Time of Day */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--on-surface-muted)] flex items-center gap-1.5">
                      <AccessTimeRounded sx={{ fontSize: 14, color: '#3B82F6' }} /> Time of Day (Hour)
                    </label>
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface)]"
                    >
                      <option value={new Date().getHours()}>Current Time ({new Date().getHours()}:00)</option>
                      <option value={20}>Peak Evening (20:00 -35%)</option>
                      <option value={14}>Afternoon (14:00 -10%)</option>
                      <option value={3}>Late Night Off-Peak (03:00 -2%)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Analysis & Predictions */}
            <div className="lg:col-span-6 space-y-5">
              {prediction ? (
                <>
                  {/* Big Speed Scorecard */}
                  <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-blue-950/20 to-indigo-950/20 border-blue-500/20 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                          Predicted Sustainable Speed
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
                            {prediction.predicted_download_mbps}
                          </span>
                          <span className="text-sm font-semibold text-blue-300">Mbps Down</span>
                          <span className="text-xs font-mono text-[var(--on-surface-muted)] ml-2">
                            / {prediction.predicted_upload_mbps} Mbps Up
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-bold">
                          {prediction.signal_quality} Signal
                        </span>
                        <p className="text-xs font-mono text-[var(--on-surface-muted)] mt-1">
                          Latency ~{prediction.predicted_latency_ms} ms
                        </p>
                      </div>
                    </div>

                    {/* RF Signal Telemetry Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="p-2 rounded-xl bg-black/15">
                        <span className="text-[10px] text-[var(--on-surface-muted)] block">Estimated RSSI</span>
                        <span className="font-mono text-xs font-bold text-white">{prediction.estimated_rssi_dbm} dBm</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/15">
                        <span className="text-[10px] text-[var(--on-surface-muted)] block">Signal-to-Noise (SNR)</span>
                        <span className="font-mono text-xs font-bold text-emerald-400">{prediction.estimated_snr_db} dB</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/15">
                        <span className="text-[10px] text-[var(--on-surface-muted)] block">Total RF Loss</span>
                        <span className="font-mono text-xs font-bold text-amber-400">-{prediction.attenuation_breakdown.total_loss_db} dB</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/15">
                        <span className="text-[10px] text-[var(--on-surface-muted)] block">Peak Congestion</span>
                        <span className="font-mono text-xs font-bold text-rose-400">-{prediction.congestion_impact_pct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Weather Telemetry Banner */}
                  {weather && (
                    <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                          {weather.precipitation_mm > 0 ? (
                            <ThunderstormRounded sx={{ fontSize: 20 }} />
                          ) : (
                            <WbSunnyRounded sx={{ fontSize: 20 }} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--on-surface)]">
                            {weather.condition_description} ({weather.temperature_c}°C, {weather.humidity_pct}% humidity)
                          </p>
                          <p className="text-[11px] text-[var(--on-surface-muted)]">
                            {weather.advisory}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-500/15 text-[var(--on-surface-muted)]">
                        Rain: {weather.precipitation_mm}mm
                      </span>
                    </div>
                  )}

                  {/* Identified Bottlenecks */}
                  <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-2.5">
                    <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <WarningAmberRounded sx={{ fontSize: 16 }} /> Environmental Bottlenecks Detected
                    </h4>
                    <ul className="space-y-1.5">
                      {prediction.bottlenecks.map((item, idx) => (
                        <li key={idx} className="text-xs text-[var(--on-surface-muted)] flex items-start gap-2">
                          <span className="text-amber-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-2.5">
                    <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LightbulbRounded sx={{ fontSize: 16 }} /> Actionable Optimization Advice
                    </h4>
                    <ul className="space-y-1.5">
                      {prediction.recommendations.map((item, idx) => (
                        <li key={idx} className="text-xs text-[var(--on-surface-muted)] flex items-start gap-2">
                          <CheckCircleOutlineRounded sx={{ fontSize: 14, color: '#10B981', marginTop: '2px' }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[var(--on-surface-muted)] gap-2">
                  <RefreshRounded className="animate-spin" sx={{ fontSize: 32 }} />
                  <p className="text-xs font-mono">Simulating RF propagation and network conditions...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex justify-between items-center text-xs text-[var(--on-surface-muted)]">
          <span className="font-mono">RFC 6349 & ITU-R P.838 Path Loss Compliant</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

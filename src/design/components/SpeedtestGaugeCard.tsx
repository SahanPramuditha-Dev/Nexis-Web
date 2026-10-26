import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import type { MeasurementPhase, ThroughputSample, CompleteMeasurement } from '@/measurement/engine'
import type { MeasurementRecord } from '@/data/models'

// ── Theme Palettes (matching Speedtest Gauge design reference) ────────────────
const THEME_TOKENS = {
  light: {
    card: 'rgba(255, 255, 255, 0.85)',
    cardBorder: 'rgba(60, 60, 67, 0.12)',
    shadow: '0 12px 40px rgba(40, 50, 100, 0.10)',
    text: '#0b0d14',
    text2: 'rgba(60, 60, 67, 0.74)',
    track: 'rgba(60, 60, 67, 0.10)',
    disc: 'rgba(255, 255, 255, 0.65)',
    discStroke: 'rgba(60, 60, 67, 0.10)',
    tickMajor: 'rgba(60, 60, 67, 0.45)',
    tickMinor: 'rgba(60, 60, 67, 0.22)',
    graphBg: 'rgba(60, 60, 67, 0.06)',
    divider: 'rgba(60, 60, 67, 0.12)',
    pill: 'rgba(255, 255, 255, 0.90)',
    stopBg: 'rgba(60, 60, 67, 0.08)',
    stopBorder: 'rgba(60, 60, 67, 0.18)',
    bezelA: '#ffffff',
    bezelB: '#d3d8e3',
    face1: '#ffffff',
    face2: '#f1f3f8',
    cPing: '#8a3fd1',
    cDown: '#0a84ff',
    cUp: '#c25a00',
    segBg: 'rgba(118, 118, 128, 0.12)',
    segOn: '#ffffff',
    segShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  dark: {
    card: 'rgba(28, 28, 30, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    shadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
    text: '#ffffff',
    text2: 'rgba(235, 235, 245, 0.64)',
    track: 'rgba(255, 255, 255, 0.08)',
    disc: 'rgba(255, 255, 255, 0.03)',
    discStroke: 'rgba(255, 255, 255, 0.08)',
    tickMajor: 'rgba(255, 255, 255, 0.45)',
    tickMinor: 'rgba(255, 255, 255, 0.18)',
    graphBg: 'rgba(0, 0, 0, 0.35)',
    divider: 'rgba(255, 255, 255, 0.08)',
    pill: 'rgba(255, 255, 255, 0.10)',
    stopBg: 'rgba(255, 255, 255, 0.12)',
    stopBorder: 'rgba(255, 255, 255, 0.20)',
    bezelA: '#3A3A3C',
    bezelB: '#1C1C1E',
    face1: '#242426',
    face2: '#121214',
    cPing: '#BF5AF2',
    cDown: '#0A84FF',
    cUp: '#FF9F0A',
    segBg: 'rgba(120, 120, 128, 0.24)',
    segOn: '#3A3A3C',
    segShadow: '0 2px 8px rgba(0,0,0,0.35)',
  },
}

// ── Non-linear speed scale mapping [0, 5, 10, 25, 50, 100, 250, 500, 1000] ───
const MARKS = [0, 5, 10, 25, 50, 100, 250, 500, 1000]
function speedToFraction(val: number): number {
  const x = Math.max(0, Math.min(val, 1000))
  const n = MARKS.length - 1
  for (let i = 0; i < n; i++) {
    if (x <= MARKS[i + 1]) {
      return (i + (x - MARKS[i]) / (MARKS[i + 1] - MARKS[i])) / n
    }
  }
  return 1
}

function niceCeil(x: number): number {
  if (x <= 0) return 10
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  for (const m of [1, 1.5, 2, 2.5, 3, 5, 7.5, 10]) {
    if (m * p >= x) return m * p
  }
  return 10 * p
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  return v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)
}

// ── Simulated Profiles ────────────────────────────────────────────────────────
export interface SpeedtestGaugeCardProps {
  speed: number
  phase: MeasurementPhase
  progress: number
  samples?: ThroughputSample[]
  result?: CompleteMeasurement | null
  latestRecord?: MeasurementRecord | null
  isRunning: boolean
  onStart: () => void
  onStop: () => void
  onShareCard?: () => void
  className?: string
}

// ── Precomputed Static Tick Geometry (41 ticks) ──────────────────────────────
interface StaticTick {
  x1: string
  y1: string
  x2: string
  y2: string
  w: number
  major: boolean
  fraction: number
}

const STATIC_TICKS: StaticTick[] = (() => {
  const C = 220
  const CY = 205
  const arr: StaticTick[] = []
  const n = MARKS.length - 1
  for (let i = 0; i <= n; i++) {
    for (let k = 0; k < 5; k++) {
      if (i === n && k > 0) break
      const frac = (i + k / 5) / n
      const a = ((135 + 270 * frac) * Math.PI) / 180
      const major = k === 0
      const r1 = major ? 121 : 131
      const r2 = 137
      arr.push({
        x1: (C + r1 * Math.cos(a)).toFixed(2),
        y1: (CY + r1 * Math.sin(a)).toFixed(2),
        x2: (C + r2 * Math.cos(a)).toFixed(2),
        y2: (CY + r2 * Math.sin(a)).toFixed(2),
        w: major ? 1.8 : 1,
        major,
        fraction: frac,
      })
    }
  }
  return arr
})()

export function SpeedtestGaugeCard({
  speed,
  phase,
  progress,
  samples = [],
  result,
  latestRecord,
  isRunning,
  onStart,
  onStop,
  onShareCard,
  className = '',
}: SpeedtestGaugeCardProps) {
  const { theme } = useSettingsStore()
  const isLight = theme === 'light'
  const colors = isLight ? THEME_TOKENS.light : THEME_TOKENS.dark

  // Smooth continuous needle animation (60/120fps delta-time spring physics)
  const [displaySpeed, setDisplaySpeed] = useState<number>(0)
  const currentSpeedRef = useRef<number>(0)

  // Target speed for the dial
  const targetSpeed = useMemo(() => {
    if (isRunning) {
      if (phase === 'latency' || phase === 'connecting') return 0
      return speed
    }
    if (phase === 'complete' && result?.downloadMbps) {
      return result.downloadMbps
    }
    if (latestRecord?.downloadMbps) {
      return latestRecord.downloadMbps
    }
    return 0
  }, [isRunning, phase, speed, result, latestRecord])

  const targetSpeedRef = useRef(targetSpeed)
  targetSpeedRef.current = targetSpeed

  useEffect(() => {
    let frameId: number
    let lastTime = performance.now()

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time

      const target = targetSpeedRef.current
      const current = currentSpeedRef.current
      const diff = target - current

      if (Math.abs(diff) > 0.02) {
        const lambda = isRunning ? 9 : 6
        const factor = 1 - Math.exp(-lambda * dt)
        const next = current + diff * factor
        currentSpeedRef.current = next
        setDisplaySpeed(next)
      } else if (current !== target) {
        currentSpeedRef.current = target
        setDisplaySpeed(target)
      }

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [isRunning])

  // State to toggle between Download and Upload curve inspection when test completes
  const [completedGraphView, setCompletedGraphView] = useState<'download' | 'upload'>('download')
  const [copied, setCopied] = useState(false)

  // Automatically sync graph view during active test phases
  useEffect(() => {
    if (phase === 'download') setCompletedGraphView('download')
    else if (phase === 'upload') setCompletedGraphView('upload')
    else if (phase === 'complete') setCompletedGraphView('download')
  }, [phase])

  const handleCopySummary = () => {
    const dl = result?.downloadMbps ?? latestRecord?.downloadMbps ?? displaySpeed
    const ul = result?.uploadMbps ?? latestRecord?.uploadMbps ?? 0
    const lat = result?.latencyMs ?? latestRecord?.latencyMs ?? 0
    const loss = result?.lossPercent ?? latestRecord?.lossPercent ?? 0
    const bb =
      result?.bufferbloatMs !== undefined && result?.bufferbloatMs !== null
        ? ` · Bufferbloat +${result.bufferbloatMs}ms`
        : ''
    const summary = `NEXIS Network Telemetry: ${fmt(dl)} Mbps ↓ / ${fmt(ul)} Mbps ↑ · ${Math.round(lat)} ms RTT${bb} · ${loss.toFixed(1)}% Loss`
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Current fraction and needle angle
  const dialFraction = speedToFraction(displaySpeed)
  const needleDeg = 135 + 270 * dialFraction

  // Phase color accents
  const DOWN_COLOR = colors.cDown
  const UP_COLOR = colors.cUp
  const PING_COLOR = colors.cPing

  let lineColor = DOWN_COLOR
  let labelColor = colors.cDown
  if (phase === 'upload') {
    lineColor = UP_COLOR
    labelColor = colors.cUp
  } else if (phase === 'latency' || phase === 'connecting') {
    lineColor = PING_COLOR
    labelColor = colors.cPing
  }

  // Center display texts
  let centerText = '0'
  let centerUnit = 'Mbps'
  let centerLabel = 'READY'

  if (phase === 'connecting') {
    centerText = '—'
    centerUnit = 'ms'
    centerLabel = 'CONNECT'
  } else if (phase === 'latency') {
    centerText = speed > 0 ? speed.toFixed(0) : '—'
    centerUnit = 'ms'
    centerLabel = 'PING'
  } else if (phase === 'download') {
    centerText = fmt(displaySpeed)
    centerUnit = 'Mbps'
    centerLabel = 'DOWNLOAD'
  } else if (phase === 'upload') {
    centerText = fmt(displaySpeed)
    centerUnit = 'Mbps'
    centerLabel = 'UPLOAD'
  } else if (phase === 'complete') {
    centerText = fmt(result?.downloadMbps ?? displaySpeed)
    centerUnit = 'Mbps'
    centerLabel = 'DOWNLOAD'
  } else if (latestRecord?.downloadMbps) {
    centerText = fmt(latestRecord.downloadMbps)
    centerUnit = 'Mbps'
    centerLabel = 'DOWNLOAD'
  }

  // Dots definitions
  let activeDotIndex = -1
  let doneDotThrough = -1

  if (phase === 'connecting' || phase === 'latency') {
    activeDotIndex = 0
  } else if (phase === 'download') {
    activeDotIndex = 1
    doneDotThrough = 0
  } else if (phase === 'upload') {
    activeDotIndex = 2
    doneDotThrough = 1
  } else if (phase === 'probe' || phase === 'complete') {
    doneDotThrough = 2
  }

  const dotDefs = [
    { name: 'Ping', c: PING_COLOR },
    { name: 'Down', c: DOWN_COLOR },
    { name: 'Up', c: UP_COLOR },
  ]

  const dots = dotDefs.map((d, i) => {
    const isActive = i === activeDotIndex
    const isDone = i <= doneDotThrough
    return {
      name: d.name,
      fill: isActive || isDone ? d.c : 'transparent',
      ring: isActive || isDone ? d.c : colors.tickMajor,
      text: isActive ? colors.text : colors.text2,
      isPulsing: isActive,
    }
  })

  const isMeasuring =
    phase !== 'idle' && phase !== 'latency' && phase !== 'connecting'

  // Progress arc dash length (pathLength = 1000)
  const arcDash = (dialFraction * 1000).toFixed(1)
  const isDownArc = phase !== 'upload' && dialFraction > 0.003
  const isUpArc = phase === 'upload' && dialFraction > 0.003

  // Overall test progress (0..100) for inner circle
  const prog100 = (Math.min(Math.max(progress, 0), 1) * 100).toFixed(1)

  // ── Live Throughput Graph Calculation ─────────────────────────────────────────
  const activeSeries = useMemo(() => {
    if (phase === 'download') {
      return samples.filter((s) => s.phase === 'download').map((s) => s.mbps)
    }
    if (phase === 'upload') {
      return samples.filter((s) => s.phase === 'upload').map((s) => s.mbps)
    }
    if (phase === 'complete' && samples.length > 0) {
      if (completedGraphView === 'upload') {
        const upSamples = samples.filter((s) => s.phase === 'upload').map((s) => s.mbps)
        if (upSamples.length > 0) return upSamples
      }
      const dlSamples = samples.filter((s) => s.phase === 'download').map((s) => s.mbps)
      if (dlSamples.length > 0) return dlSamples
      return samples.map((s) => s.mbps)
    }
    if (latestRecord?.samples && latestRecord.samples.length > 0) {
      if (completedGraphView === 'upload') {
        const upSamples = latestRecord.samples.filter((s) => s.phase === 'upload').map((s) => s.mbps)
        if (upSamples.length > 0) return upSamples
      }
      const dlSamples = latestRecord.samples.filter((s) => s.phase === 'download').map((s) => s.mbps)
      if (dlSamples.length > 0) return dlSamples
      return latestRecord.samples.map((s) => s.mbps)
    }
    return []
  }, [phase, samples, latestRecord, completedGraphView])

  const graphUp = phase === 'upload' || (phase === 'complete' && completedGraphView === 'upload')
  const graphColor =
    phase === 'latency' || phase === 'connecting'
      ? PING_COLOR
      : graphUp
      ? UP_COLOR
      : DOWN_COLOR

  // Dynamic Y-axis ceiling
  const seriesMax = activeSeries.length > 0 ? Math.max(...activeSeries) : 10
  const yCeiling = niceCeil(seriesMax * 1.25)
  const yOf = (v: number) => 100 - 4 - Math.min(v / yCeiling, 1) * 92
  const xOf = (idx: number, total: number) => 6 + (idx / Math.max(total - 1, 1)) * 288

  // Sample reduction and Catmull-Rom path generation
  const pts: [number, number][] = useMemo(() => {
    if (activeSeries.length === 0) return []
    const total = activeSeries.length
    const points: [number, number][] = []
    const step = total > 60 ? 3 : total > 30 ? 2 : 1
    for (let i = 0; i < total; i += step) {
      points.push([xOf(i, total), yOf(activeSeries[i])])
    }
    if (total > 1 && (total - 1) % step !== 0) {
      points.push([xOf(total - 1, total), yOf(activeSeries[total - 1])])
    }
    return points
  }, [activeSeries, yCeiling])

  const { linePath, areaPath } = useMemo(() => {
    if (pts.length < 2) return { linePath: '', areaPath: '' }
    let seg = ''
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      seg += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
    }
    const first = pts[0]
    const last = pts[pts.length - 1]
    const lineP = `M${first[0].toFixed(1)},${first[1].toFixed(1)}${seg}`
    const areaP = `M${first[0].toFixed(1)},100 L${first[0].toFixed(1)},${first[1].toFixed(1)}${seg} L${last[0].toFixed(1)},100 Z`
    return { linePath: lineP, areaPath: areaP }
  }, [pts])

  // Average line calculation
  const hasAvg = activeSeries.length > 5
  const avg = useMemo(() => {
    if (phase === 'complete') {
      if (completedGraphView === 'upload' && result?.uploadMbps) return result.uploadMbps
      if (completedGraphView === 'download' && result?.downloadMbps) return result.downloadMbps
    }
    if (!hasAvg) return 0
    const tail = activeSeries.slice(Math.floor(activeSeries.length * 0.35))
    return tail.reduce((a, b) => a + b, 0) / tail.length
  }, [activeSeries, hasAvg, phase, result, completedGraphView])
  const avgYv = yOf(avg)

  const lastV = useMemo(() => {
    if (phase === 'complete') {
      if (completedGraphView === 'upload' && result?.uploadMbps) return result.uploadMbps
      if (completedGraphView === 'download' && result?.downloadMbps) return result.downloadMbps
    }
    return activeSeries.length > 0 ? activeSeries[activeSeries.length - 1] : 0
  }, [activeSeries, phase, result, completedGraphView])
  const dotXPct = pts.length > 0 ? (pts[pts.length - 1][0] / 300) * 100 : 0
  const dotYPct = pts.length > 0 ? pts[pts.length - 1][1] : 96

  const graphCaption =
    phase === 'latency' || phase === 'connecting'
      ? 'Waiting'
      : phase === 'idle'
      ? 'Waiting'
      : graphUp
      ? 'Upload · Mbps'
      : 'Download · Mbps'

  const emptyText =
    phase === 'latency' || phase === 'connecting'
      ? 'Measuring latency…'
      : 'Start a test to see live throughput'

  const handleToggle = () => {
    if (isRunning) {
      onStop()
    } else {
      onStart()
    }
  }

  const isDoneState = phase === 'complete'
  const btnLabel = isRunning ? 'Stop' : isDoneState ? 'Run again' : 'Start test'

  return (
    <section
      className={`relative w-full rounded-[32px] p-6 sm:p-7 flex flex-col items-center gap-5 transition-all duration-300 border ${className}`}
      style={{
        background: colors.card,
        borderColor: colors.cardBorder,
        boxShadow: colors.shadow,
        backdropFilter: 'blur(28px) saturate(180%)',
        color: colors.text,
      }}
    >
      {/* ── Circular Speed Gauge ────────────────────────────────────────── */}
      <div className="relative w-full max-w-[420px]">
        <svg
          viewBox="0 0 440 400"
          role="img"
          aria-label={`Speed gauge: ${centerText} ${centerUnit}`}
          className="w-full h-auto block select-none overflow-visible"
        >
          <defs>
            {/* Download Cyan-to-Blue Linear Gradient */}
            <linearGradient id="gDown" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="370" y2="0">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="0.5" stopColor="#0a84ff" />
              <stop offset="1" stopColor="#5b6cff" />
            </linearGradient>

            {/* Upload Yellow-to-Orange Linear Gradient */}
            <linearGradient id="gUp" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="370" y2="0">
              <stop offset="0" stopColor="#ffd24d" />
              <stop offset="0.5" stopColor="#ff9f0a" />
              <stop offset="1" stopColor="#ff7a1a" />
            </linearGradient>

            {/* Outer Bezel Gradient */}
            <linearGradient id="speedBezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.bezelA} />
              <stop offset="1" stopColor={colors.bezelB} />
            </linearGradient>

            {/* Inner Face Radial Gradient */}
            <radialGradient id="speedFace" cx="50%" cy="35%" r="75%">
              <stop offset="0" stopColor={colors.face1} />
              <stop offset="1" stopColor={colors.face2} />
            </radialGradient>
          </defs>

          {/* Outer Bezel Ring with Apple-style elevation shadow */}
          <circle
            cx="220"
            cy="205"
            r="180"
            fill="none"
            stroke="url(#speedBezel)"
            strokeWidth="8"
            style={{
              filter: isLight
                ? 'drop-shadow(0 8px 14px rgba(20,30,60,0.12))'
                : 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
            }}
          />

          {/* Disc Face */}
          <circle
            cx="220"
            cy="205"
            r="175.5"
            fill="url(#speedFace)"
            strokeWidth="1"
            stroke={colors.discStroke}
          />

          {/* Background Track Arc (270° from 135° to 45°) */}
          <path
            d="M 113.93 311.07 A 150 150 0 1 1 326.07 311.07"
            pathLength="1000"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={colors.track}
          />

          {/* Download Colored Arc */}
          <path
            d="M 113.93 311.07 A 150 150 0 1 1 326.07 311.07"
            pathLength="1000"
            fill="none"
            stroke="url(#gDown)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${arcDash} 1000`}
            style={{
              opacity: isDownArc ? 1 : 0,
              filter: 'drop-shadow(0 0 6px rgba(10,132,255,0.45))',
              transition: 'opacity 0.2s ease',
            }}
          />

          {/* Upload Colored Arc */}
          <path
            d="M 113.93 311.07 A 150 150 0 1 1 326.07 311.07"
            pathLength="1000"
            fill="none"
            stroke="url(#gUp)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${arcDash} 1000`}
            style={{
              opacity: isUpArc ? 1 : 0,
              filter: 'drop-shadow(0 0 6px rgba(255,159,10,0.45))',
              transition: 'opacity 0.2s ease',
            }}
          />

          {/* Dynamic Dial Ticks (Major & Minor) */}
          {STATIC_TICKS.map((t, idx) => {
            const isLit = isMeasuring && t.fraction <= dialFraction
            const strokeColor = t.major
              ? isLit
                ? colors.text
                : colors.tickMajor
              : isLit
              ? colors.tickMajor
              : colors.tickMinor
            return (
              <line
                key={idx}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                strokeWidth={t.w}
                strokeLinecap="round"
                stroke={strokeColor}
              />
            )
          })}

          {/* Inner Concentric Circle & Overall Progress Track */}
          <circle cx="220" cy="205" r="98" fill="none" strokeWidth="1.5" stroke={colors.track} />
          <circle
            cx="220"
            cy="205"
            r="98"
            pathLength="100"
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${prog100} 100`}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '220px 205px',
            }}
          />

          {/* Non-linear Scale Numbers (0, 10, 50, 250, 1000) */}
          <g
            textAnchor="middle"
            style={{
              fill: colors.text2,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
              fontSize: 13,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <text x="82.8" y="346">0</text>
            <text x="40.8" y="135">10</text>
            <text x="220" y="38">50</text>
            <text x="399.2" y="135">250</text>
            <text x="357.2" y="346">1000</text>
          </g>

          {/* Needle Indicator Knob (Rotated around 220, 205) */}
          <g
            style={{
              transform: `rotate(${needleDeg}deg)`,
              transformOrigin: '220px 205px',
              willChange: 'transform',
            }}
          >
            <circle cx="370" cy="205" r="14" fill={lineColor} opacity="0.18" />
            <circle
              cx="370"
              cy="205"
              r="8.5"
              fill="#ffffff"
              stroke={lineColor}
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))' }}
            />
          </g>
        </svg>

        {/* Center Readout Overlay */}
        <div
          className="absolute inset-x-0 flex flex-col items-center pointer-events-none select-none"
          style={{ top: '51.25%', transform: 'translateY(-50%)' }}
        >
          <span
            className="text-[13px] font-bold tracking-[0.12em] uppercase transition-colors"
            style={{ color: labelColor }}
          >
            {centerLabel}
          </span>
          <span
            className="text-6xl sm:text-7xl font-light tracking-tight tabular-nums leading-none my-1"
            style={{ color: colors.text }}
          >
            {centerText}
          </span>
          <span className="text-[15px] font-medium" style={{ color: colors.text2 }}>
            {centerUnit}
          </span>

          {/* Phase Status Dots Row (Ping, Down, Up) */}
          <div className="flex items-center gap-3.5 mt-2">
            {dots.map((d) => (
              <span
                key={d.name}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: d.text }}
              >
                <span
                  className={`w-2 h-2 rounded-full border-[1.5px] ${
                    d.isPulsing ? 'speedtest-dot-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: d.fill,
                    borderColor: d.ring,
                    boxShadow: d.isPulsing ? `0 0 8px ${d.ring}` : 'none',
                  }}
                />
                <span>{d.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Throughput Linear Graph ─────────────────────────────────── */}
      <div className="w-full max-w-[420px] flex flex-col gap-2">
        {/* Caption Header */}
        <div className="flex justify-between items-center text-[13px] font-medium min-h-[26px]" style={{ color: colors.text2 }}>
          {isDoneState || (!isRunning && latestRecord) ? (
            <div
              className="inline-flex items-center gap-1 p-0.5 rounded-full border shadow-xs"
              style={{ background: colors.graphBg, borderColor: colors.cardBorder }}
            >
              <button
                type="button"
                onClick={() => setCompletedGraphView('download')}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none"
                style={{
                  background: completedGraphView === 'download' ? 'rgba(10, 132, 255, 0.2)' : 'transparent',
                  color: completedGraphView === 'download' ? colors.cDown : colors.text2,
                  boxShadow: completedGraphView === 'download' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                ↓ Down
              </button>
              <button
                type="button"
                onClick={() => setCompletedGraphView('upload')}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none"
                style={{
                  background: completedGraphView === 'upload' ? 'rgba(255, 159, 10, 0.2)' : 'transparent',
                  color: completedGraphView === 'upload' ? colors.cUp : colors.text2,
                  boxShadow: completedGraphView === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                ↑ Up
              </button>
            </div>
          ) : (
            <span>Live throughput</span>
          )}
          <span className="tabular-nums">{graphCaption}</span>
        </div>

        {/* Graph + Y-Axis Row */}
        <div className="flex gap-2.5 items-stretch">
          <div
            className="relative flex-1 min-w-0 h-[112px] rounded-[14px] overflow-hidden"
            style={{ background: colors.graphBg }}
          >
            <svg
              viewBox="0 0 300 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full block"
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={graphColor} stopOpacity="0.45" />
                  <stop offset="1" stopColor={graphColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="25" x2="300" y2="25" strokeWidth="1" stroke={colors.divider} vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="50" x2="300" y2="50" strokeWidth="1" stroke={colors.divider} vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="75" x2="300" y2="75" strokeWidth="1" stroke={colors.divider} vectorEffect="non-scaling-stroke" />

              {/* Area Gradient Fill */}
              {areaPath && <path d={areaPath} fill="url(#areaFill)" />}

              {/* Dashed Average Line */}
              {hasAvg && (
                <line
                  x1="0"
                  y1={avgYv}
                  x2="300"
                  y2={avgYv}
                  stroke={graphColor}
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.85"
                />
              )}

              {/* Smooth Catmull-Rom Live Curve */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={graphColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* Empty or Waiting State Overlay */}
            {activeSeries.length < 2 && (
              <div
                className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs select-none"
                style={{ color: colors.text2 }}
              >
                {emptyText}
              </div>
            )}

            {/* Floating Average Pill Badge */}
            {hasAvg && (
              <div
                className="absolute left-2.5 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums border shadow-xs"
                style={{
                  top: `${avgYv}%`,
                  transform: 'translateY(-130%)',
                  background: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                }}
              >
                Avg {fmt(avg)}
              </div>
            )}

            {/* Glowing End Knob and Current Value Pill Badge */}
            {activeSeries.length > 1 && (
              <div
                className="absolute w-0 h-0 pointer-events-none"
                style={{ left: `${dotXPct}%`, top: `${dotYPct}%` }}
              >
                {/* Knob Dot */}
                <span
                  className="absolute -left-[7px] -top-[7px] w-3.5 h-3.5 rounded-full bg-white shadow-md"
                  style={{
                    border: `3.5px solid ${graphColor}`,
                  }}
                />

                {/* Value Pill Badge */}
                {dotXPct > 24 && (
                  <span
                    className="absolute right-3.5 -top-[11px] px-2 h-[22px] flex items-center rounded-full text-xs font-bold tabular-nums whitespace-nowrap shadow-xs"
                    style={{
                      background: graphColor,
                      color: '#0b0d14',
                    }}
                  >
                    {fmt(lastV)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Y-Axis Labels */}
          <div
            className="w-[58px] shrink-0 flex flex-col justify-between pl-1 text-xs tabular-nums"
            style={{ color: colors.text2 }}
          >
            <span>{fmt(yCeiling)}</span>
            <span>{fmt(yCeiling / 2)}</span>
            <span>0</span>
          </div>
        </div>

        {/* X-Axis Time Labels */}
        <div
          className="flex justify-between mr-[68px] text-xs font-mono"
          style={{ color: colors.text2 }}
        >
          <span>0 s</span>
          <span>2 s</span>
          <span>4 s</span>
          <span>6 s</span>
        </div>
      </div>

      {/* ── Action Buttons ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-[420px] justify-center">
        <button
          onClick={handleToggle}
          className="w-full sm:flex-1 min-h-[54px] px-8 rounded-full font-semibold text-[16px] tracking-tight cursor-pointer transition-all duration-200 active:scale-98 select-none"
          style={{
            background: isRunning
              ? colors.stopBg
              : 'linear-gradient(135deg, #0a84ff 0%, #4f6bff 100%)',
            border: isRunning
              ? `1px solid ${colors.stopBorder}`
              : '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: isRunning ? 'none' : '0 10px 24px rgba(10, 132, 255, 0.32)',
            color: isRunning ? colors.text : '#ffffff',
          }}
        >
          {btnLabel}
        </button>

        {(isDoneState || (!isRunning && latestRecord)) && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 sm:flex-initial px-4 min-h-[54px] rounded-full font-medium text-xs border flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-98 hover:opacity-90 select-none shadow-xs"
              style={{
                background: colors.graphBg,
                borderColor: colors.cardBorder,
                color: colors.text,
              }}
              title="Copy test telemetry summary to clipboard"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            {onShareCard && (
              <button
                type="button"
                onClick={onShareCard}
                className="px-4 min-h-[54px] rounded-full font-medium text-xs border flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-98 hover:opacity-90 select-none shadow-xs"
                style={{
                  background: colors.graphBg,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                }}
                title="Generate high-res shareable image certificate"
              >
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share Card</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

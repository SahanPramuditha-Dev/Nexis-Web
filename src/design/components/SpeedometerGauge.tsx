import React from 'react'

interface SpeedometerGaugeProps {
  currentMbps: number
  phase?: string
  progressFraction?: number
}

// Logarithmic milestone scale matching Reference 2:
// 0, 10, 50, 100, 200, 300, 500, 750, 950
const MILESTONES = [
  { val: 0, label: '0' },
  { val: 10, label: '10' },
  { val: 50, label: '50' },
  { val: 100, label: '100' },
  { val: 200, label: '200' },
  { val: 300, label: '300' },
  { val: 500, label: '500' },
  { val: 750, label: '750' },
  { val: 950, label: '950' },
]

export function SpeedometerGauge({
  currentMbps,
  phase = 'IDLE',
}: SpeedometerGaugeProps) {
  const center = 190
  const startAngle = 145
  const totalSweep = 250

  // Calculate needle angle across logarithmic scale
  const calcAngle = (speed: number) => {
    if (speed <= 0) return startAngle
    if (speed >= 950) return startAngle + totalSweep

    for (let i = 0; i < MILESTONES.length - 1; i++) {
      const low = MILESTONES[i]
      const high = MILESTONES[i + 1]
      if (speed >= low.val && speed <= high.val) {
        const spanFraction = (speed - low.val) / (high.val - low.val)
        const stepAngle = totalSweep / (MILESTONES.length - 1)
        return startAngle + i * stepAngle + spanFraction * stepAngle
      }
    }
    return startAngle
  }

  const needleAngle = calcAngle(currentMbps)
  const activeSweep = Math.max(0, needleAngle - startAngle)

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    }
  }

  const describeArc = (cx: number, cy: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(cx, cy, r, endA)
    const end = polarToCartesian(cx, cy, r, startA)
    const largeArcFlag = endA - startA <= 180 ? '0' : '1'
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ')
  }

  // Dial geometry radii
  const outerTrackRadius = 155
  const innerTrackRadius = 135
  const hubRadius = 68

  // Outer segmented arc sections
  const fullTrack = describeArc(center, center, outerTrackRadius, startAngle, startAngle + totalSweep)
  const activeTrack = describeArc(center, center, outerTrackRadius, startAngle, startAngle + activeSweep)

  // Secondary inner step arc
  const innerStepTrack = describeArc(center, center, innerTrackRadius, startAngle + 30, startAngle + totalSweep - 30)

  // Milestone ticks and labels
  const stepAngle = totalSweep / (MILESTONES.length - 1)
  const milestoneNodes = MILESTONES.map((m, idx) => {
    const angle = startAngle + idx * stepAngle
    const tickOuter = polarToCartesian(center, center, outerTrackRadius + 6, angle)
    const tickInner = polarToCartesian(center, center, outerTrackRadius - 4, angle)
    const labelPos = polarToCartesian(center, center, innerTrackRadius - 15, angle)
    return { ...m, angle, tickOuter, tickInner, labelPos, active: angle <= needleAngle }
  })

  // Needle tip coordinate
  const needleTip = polarToCartesian(center, center, outerTrackRadius + 2, needleAngle)

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      {/* Ambient background glow orb */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none filter blur-[80px] opacity-20"
        style={{
          background: 'radial-gradient(circle, #00E5FF 0%, #38BDF8 40%, transparent 80%)',
          top: '30px',
        }}
      />

      <svg width={380} height={330} viewBox="0 0 380 330" className="overflow-visible relative z-10">
        <defs>
          <linearGradient id="activeArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="60%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FF334B" />
          </linearGradient>

          <radialGradient id="centerHubMetallic" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#2D3748" />
            <stop offset="45%" stopColor="#1A202C" />
            <stop offset="85%" stopColor="#0F141C" />
            <stop offset="100%" stopColor="#080A0F" />
          </radialGradient>

          <filter id="needleGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Segmented Background Outer Ring ────────────────────────────── */}
        <path
          d={fullTrack}
          fill="none"
          stroke="#1E2633"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* ── Inner Stepped Secondary Arc (Reference 2 style) ─────────────── */}
        <path
          d={innerStepTrack}
          fill="none"
          stroke="#161C26"
          strokeWidth={14}
          strokeLinecap="butt"
          strokeDasharray="4 6"
        />

        {/* ── Active Speed Track with Multi-Tone Gradient ─────────────────── */}
        {activeSweep > 1 && (
          <path
            d={activeTrack}
            fill="none"
            stroke="url(#activeArcGrad)"
            strokeWidth={9}
            strokeLinecap="round"
            filter="url(#needleGlowFilter)"
          />
        )}

        {/* ── Milestone Ticks & Numerical Labels ──────────────────────────── */}
        {milestoneNodes.map((m) => (
          <g key={m.val}>
            <line
              x1={m.tickOuter.x}
              y1={m.tickOuter.y}
              x2={m.tickInner.x}
              y2={m.tickInner.y}
              stroke={m.active ? '#00E5FF' : '#334155'}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <text
              x={m.labelPos.x}
              y={m.labelPos.y + 4}
              textAnchor="middle"
              fill={m.active ? '#F8FAFC' : '#64748B'}
              className="text-[11px] font-bold font-mono"
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* ── Precision Needle Hand ────────────────────────────────────────── */}
        <line
          x1={center}
          y1={center}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#FF334B"
          strokeWidth={2.5}
          strokeLinecap="round"
          filter="url(#needleGlowFilter)"
        />

        {/* ── Central Metallic Automotive Hub ─────────────────────────────── */}
        <circle
          cx={center}
          cy={center}
          r={hubRadius}
          fill="url(#centerHubMetallic)"
          stroke="#334155"
          strokeWidth={2}
          filter="drop-shadow(0 6px 14px rgba(0,0,0,0.8))"
        />

        <circle
          cx={center}
          cy={center}
          r={hubRadius - 12}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={1.5}
        />

        {/* Pivot Jewel Pin */}
        <circle cx={center} cy={center} r={6} fill="#FF334B" />
        <circle cx={center} cy={center} r={2} fill="#FFFFFF" />

        {/* ── Primary Readout Below Hub ───────────────────────────────────── */}
        <text
          x={center}
          y={center + hubRadius + 38}
          textAnchor="middle"
          fill="#94A3B8"
          className="text-[11px] font-bold uppercase tracking-widest font-mono"
        >
          {phase === 'IDLE' ? 'READY TO TEST' : phase}
        </text>

        <text
          x={center}
          y={center + hubRadius + 75}
          textAnchor="middle"
          fill="#F8FAFC"
          className="font-black tracking-tight"
          style={{ fontSize: '48px', fontFamily: 'Roboto Mono, monospace' }}
        >
          {currentMbps.toFixed(2)}
        </text>

        <text
          x={center}
          y={center + hubRadius + 96}
          textAnchor="middle"
          fill="#64748B"
          className="text-xs font-bold uppercase tracking-widest font-mono"
        >
          Mbps
        </text>
      </svg>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'

interface NexisSpeedDialProps {
  speed: number
  maxSpeed?: number
  phase?: string
  isTesting?: boolean
  progress?: number // 0..1
}

// Adaptive non-linear scale for modern internet speeds:
// 0 -> 10 Mbps (20%), 10 -> 50 Mbps (40%), 50 -> 100 Mbps (60%), 100 -> 500 Mbps (85%), 500 -> 1000 Mbps (100%)
function speedToFraction(val: number): number {
  if (val <= 0) return 0
  if (val <= 10) {
    return (val / 10) * 0.20
  } else if (val <= 50) {
    return 0.20 + ((val - 10) / 40) * 0.20
  } else if (val <= 100) {
    return 0.40 + ((val - 50) / 50) * 0.20
  } else if (val <= 500) {
    return 0.60 + ((val - 100) / 400) * 0.25
  } else {
    return Math.min(0.85 + ((val - 500) / 500) * 0.15, 1)
  }
}

export function NexisSpeedDial({
  speed,
  phase = 'IDLE',
  isTesting = false,
  progress = 0,
}: NexisSpeedDialProps) {
  // Delta-time damped physics for buttery 60/120fps needle motion
  const [displaySpeed, setDisplaySpeed] = useState(speed)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    let frameId: number
    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time
      }
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      setDisplaySpeed((prev) => {
        const diff = speed - prev
        if (Math.abs(diff) < 0.05) return speed
        const lambda = isTesting ? 14 : 8
        const factor = 1 - Math.exp(-lambda * dt)
        return prev + diff * factor
      })
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frameId)
      lastTimeRef.current = null
    }
  }, [speed, isTesting])

  // Precision Telemetry Arc Geometry
  // Center (170, 136), Radius = 120, 240° arch (-120° to +120°)
  const cx = 170
  const cy = 136
  const radius = 120
  const strokeWidth = 6.5

  const startDeg = -120
  const totalSweep = 240

  const currentFraction = speedToFraction(displaySpeed)
  const activeSweep = totalSweep * currentFraction
  const progressFraction = Math.min(Math.max(progress, 0), 1)

  const polar = (angleDegrees: number, r: number) => {
    const rad = (angleDegrees * Math.PI) / 180.0
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    }
  }

  const describeArc = (r: number, fromAngle: number, sweep: number) => {
    if (sweep <= 0.1) return ''
    const safeSweep = Math.min(sweep, 359.9)
    const p1 = polar(fromAngle, r)
    const p2 = polar(fromAngle + safeSweep, r)
    const largeArcFlag = safeSweep > 180 ? 1 : 0
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  const trackPath = describeArc(radius, startDeg, totalSweep)
  const activePath = describeArc(radius, startDeg, activeSweep)
  const haloTrackPath = describeArc(radius + 12, startDeg, totalSweep * progressFraction)

  // Current tip coordinate for precision indicator
  const needleAngle = startDeg + activeSweep
  const needleTip = polar(needleAngle, radius)

  // Clean, well-spaced milestones
  const keyMilestones = [
    { label: '0', frac: 0 },
    { label: '10', frac: 0.20 },
    { label: '50', frac: 0.40 },
    { label: '100', frac: 0.60 },
    { label: '500', frac: 0.85 },
  ]

  const phaseUpper = phase.toUpperCase()
  const isConnecting = phaseUpper === 'CONNECTING'
  const isLatency = phaseUpper === 'LATENCY'
  const isUploading = phaseUpper === 'UPLOAD'
  const _isDownloading = phaseUpper === 'DOWNLOAD'

  const accentColor = isUploading ? '#BF5AF2' : isLatency ? '#FF9F0A' : '#0A84FF'
  const gradientId = isUploading ? 'ulGradClean' : isLatency ? 'latGradClean' : 'dlGradClean'

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1 w-full max-w-[340px]">
      {/* Discreet Atmospheric Glow */}
      <div
        className="absolute w-60 h-60 rounded-full pointer-events-none filter blur-[50px] opacity-20 transition-all duration-700 -z-10"
        style={{
          background: isTesting
            ? `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* SVG Canvas for Track and Arcs */}
      <div className="relative w-full aspect-[340/240]">
        <svg
          viewBox="0 0 340 240"
          className="w-full h-full overflow-visible"
          aria-label={`Current measured speed: ${displaySpeed.toFixed(1)} Mbps`}
        >
          <defs>
            <linearGradient id="dlGradClean" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0A84FF" />
              <stop offset="60%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#64D2FF" />
            </linearGradient>

            <linearGradient id="ulGradClean" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5E5CE6" />
              <stop offset="60%" stopColor="#BF5AF2" />
              <stop offset="100%" stopColor="#E08AFF" />
            </linearGradient>

            <linearGradient id="latGradClean" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF9F0A" />
              <stop offset="100%" stopColor="#FFD60A" />
            </linearGradient>

            <filter id="cleanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={accentColor} floodOpacity="0.55" />
            </filter>
          </defs>

          {/* 1. Subtle Outer Progress Halo */}
          {isTesting && haloTrackPath && (
            <path
              d={haloTrackPath}
              fill="none"
              stroke={accentColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.35}
              className="transition-all duration-200"
            />
          )}

          {/* 2. Base Resting Hairline Track */}
          <path
            d={trackPath}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.65}
          />

          {/* 3. Active Stream Arc */}
          {activePath && (
            <path
              d={activePath}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter="url(#cleanGlow)"
              className="transition-all duration-75"
            />
          )}

          {/* 4. Precision Luminous Tip Bead */}
          {displaySpeed > 0.05 && (
            <g transform={`translate(${needleTip.x.toFixed(2)}, ${needleTip.y.toFixed(2)})`}>
              <circle
                r={6}
                fill="var(--bg-surface)"
                stroke={accentColor}
                strokeWidth={2.5}
                filter="url(#cleanGlow)"
              />
              <circle r={2} fill="#FFFFFF" />
            </g>
          )}

          {/* 5. Minimalist Milestone Labels [0, 10, 50, 100, 500] */}
          {keyMilestones.map((m) => {
            const deg = startDeg + totalSweep * m.frac
            const p = polar(deg, radius - 20)
            const isPassed = deg <= needleAngle && isTesting
            return (
              <text
                key={m.label}
                x={p.x.toFixed(1)}
                y={p.y.toFixed(1)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isPassed ? 'var(--on-surface)' : 'var(--on-surface-dim)'}
                className="text-[10px] font-mono font-medium transition-colors duration-200"
                style={{ opacity: isPassed ? 0.9 : 0.4 }}
              >
                {m.label}
              </text>
            )
          })}
        </svg>

        {/* 6. Centered HTML Overlay for Pixel-Perfect Alignment */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
          {/* Main Numeric Readout - Apple SF Pro Bold Tabular */}
          <span
            className="font-sans font-extrabold text-5xl sm:text-6xl tracking-tight text-[var(--on-surface)] tabular-nums leading-none"
            style={{ letterSpacing: '-0.04em' }}
          >
            {displaySpeed.toFixed(1)}
          </span>

          {/* Correct lowercase Unit */}
          <span className="text-xs font-mono font-medium text-[var(--on-surface-muted)] tracking-wider mt-1">
            Mbps
          </span>

          {/* Perfectly Centered Status Label */}
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: isTesting ? accentColor : 'var(--color-success)',
                boxShadow: isTesting ? `0 0 6px ${accentColor}` : 'none',
              }}
            />
            <span
              className="text-[11px] font-sans font-semibold tracking-wider uppercase"
              style={{
                color: isTesting ? 'var(--on-surface)' : 'var(--on-surface-muted)',
              }}
            >
              {isTesting
                ? isConnecting
                  ? 'CHECKING CONNECTION'
                  : isLatency
                  ? 'LATENCY & JITTER'
                  : `${phaseUpper} STREAM`
                : phaseUpper === 'COMPLETE'
                ? 'TEST COMPLETED'
                : 'READY TO TEST'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

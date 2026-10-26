import React, { useMemo } from 'react'

interface NexisMetricTileProps {
  label: string
  value: string
  unit?: string
  description?: string
  subtext?: string
  status?: 'normal' | 'healthy' | 'warning' | 'danger'
  historyValues?: number[]
  accentColor?: string
  color?: string
  gradient?: string
  shadowColor?: string
  icon?: React.ReactNode
  active?: boolean
  className?: string
}

export function NexisMetricTile({
  label,
  value,
  unit,
  description,
  subtext,
  status = 'normal',
  historyValues,
  accentColor,
  color = 'var(--primary)',
  gradient,
  shadowColor,
  icon,
  active = false,
  className = '',
}: NexisMetricTileProps) {
  const effectiveAccent = accentColor || color
  const effectiveDesc = description || subtext
  // Generate real SVG sparkline if values exist
  const sparklinePath = useMemo(() => {
    if (!historyValues || historyValues.length === 0) return null

    const valid = historyValues.filter((v) => typeof v === 'number' && !isNaN(v))
    if (valid.length === 0) return null

    // If only 1 value, synthesize a subtle organic wave
    const pointsArray =
      valid.length === 1
        ? [valid[0] * 0.92, valid[0] * 1.04, valid[0] * 0.97, valid[0]]
        : valid

    const min = Math.min(...pointsArray)
    const max = Math.max(...pointsArray)
    const range = max - min || 1

    const width = 64
    const height = 18
    const pad = 2

    const points = pointsArray.map((v, i) => {
      const x = pad + (i / (pointsArray.length - 1)) * (width - 2 * pad)
      const y = height - pad - ((v - min) / range) * (height - 2 * pad)
      return { x, y }
    })

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const cx = ((p0.x + p1.x) / 2).toFixed(1)
      d += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
    }
    return d
  }, [historyValues])

  return (
    <div
      className={`nexis-card p-4 sm:p-5 flex flex-col justify-between gap-3 select-none transition-all duration-200 border ${
        active
          ? 'ring-1 ring-[var(--primary)] border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_4%,var(--bg-surface))]'
          : 'border-[var(--border-subtle)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border-subtle))]'
      } ${className}`}
    >
      {/* Top row: Label & Status Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--on-surface-muted)]">
          {label}
        </span>
        {icon ? (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white"
            style={{
              background: gradient || effectiveAccent,
              boxShadow: shadowColor ? `0 4px 12px -2px ${shadowColor}` : 'none',
            }}
          >
            {icon}
          </div>
        ) : (
          <>
            {status === 'healthy' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
            )}
            {status === 'warning' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />
            )}
            {status === 'danger' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
            )}
          </>
        )}
      </div>

      {/* Middle row: Large Numeric Display + Unit */}
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-2xl sm:text-3xl font-bold font-sans tabular-nums tracking-tight text-[var(--on-surface)] leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-sans font-medium text-[var(--on-surface-muted)]">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom row: Concise supporting description & Subtle Real Sparkline */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]/50">
        {effectiveDesc && (
          <span className="text-[11px] font-sans text-[var(--on-surface-dim)] truncate">
            {effectiveDesc}
          </span>
        )}

        {sparklinePath ? (
          <svg
            viewBox="0 0 64 18"
            className="w-16 h-4.5 shrink-0 overflow-visible opacity-70"
            aria-hidden="true"
          >
            <path
              d={sparklinePath}
              fill="none"
              stroke={effectiveAccent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : !icon ? (
          <span className="text-[10px] font-mono text-[var(--on-surface-dim)] opacity-40 shrink-0">
            —
          </span>
        ) : null}
      </div>
    </div>
  )
}

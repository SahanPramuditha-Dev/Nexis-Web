import { useMemo } from 'react'
import { buildSparklineGeometry } from '../utils/qoeScoring'

interface NodeSparklineProps {
  values: number[]
  color?: string
  unit?: string
  label?: string
  width?: number
  height?: number
}

export function NodeSparkline({
  values,
  color = '#00E5FF',
  unit = 'Mbps',
  label = 'Throughput Trend',
  width = 240,
  height = 42,
}: NodeSparklineProps) {
  const geom = useMemo(() => {
    return buildSparklineGeometry(values, width, height, 4)
  }, [values, width, height])

  if (values.length < 2) return null

  const gradientId = `spark-grad-${Math.abs(values.reduce((a, b) => a + b, 0)).toFixed(0)}`

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--on-surface-dim)]">
        <span className="uppercase font-bold tracking-wider">{label}</span>
        <span>
          Peak: <strong className="text-[var(--color-success)]">{geom.maxVal.toFixed(1)} {unit}</strong>
        </span>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden bg-[var(--bg-canvas)]/50 border border-[var(--border-subtle)]/60 p-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          preserveAspectRatio="none"
          style={{ height }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {geom.areaD && <path d={geom.areaD} fill={`url(#${gradientId})`} />}

          {/* Core trendline */}
          {geom.pathD && (
            <path
              d={geom.pathD}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* End point marker */}
          {geom.points.length > 0 && (
            <circle
              cx={geom.points[geom.points.length - 1].x}
              cy={geom.points[geom.points.length - 1].y}
              r={3}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={2}
            />
          )}
        </svg>

        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--on-surface-dim)] mt-0.5 px-0.5">
          <span>Min: {geom.minVal.toFixed(1)} {unit}</span>
          <span>Latest: {geom.lastVal.toFixed(1)} {unit}</span>
        </div>
      </div>
    </div>
  )
}

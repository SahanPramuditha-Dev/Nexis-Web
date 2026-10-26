import React from 'react'

interface LiveThroughputGraphProps {
  points: number[] // history of Mbps values
  maxVal?: number
  height?: number
  strokeColor?: string
}

export function LiveThroughputGraph({
  points,
  maxVal = 100,
  height = 55,
  strokeColor = '#00E5FF',
}: LiveThroughputGraphProps) {
  if (points.length < 2) {
    return (
      <div
        className="w-full rounded-xl flex items-center justify-center text-[10px] uppercase font-mono tracking-wider border"
        style={{
          height: `${height}px`,
          background: 'rgba(19, 26, 34, 0.4)',
          borderColor: 'var(--outline)',
          color: 'var(--on-surface-var)',
        }}
      >
        Live Throughput Waveform Ready
      </div>
    )
  }

  const width = 360
  const peak = Math.max(...points, maxVal, 10)
  const step = width / (points.length - 1)

  const coords = points.map((val, i) => {
    const x = i * step
    const y = height - (val / peak) * (height - 10) - 5
    return { x, y }
  })

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
  }, '')

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: 'var(--on-surface-var)' }}>
        <span>TELEMETRY STREAM</span>
        <span>PEAK: {Math.round(peak)} MBPS</span>
      </div>

      <div
        className="w-full rounded-xl overflow-hidden border relative"
        style={{ height: `${height}px`, background: 'rgba(11, 15, 20, 0.7)', borderColor: 'var(--outline)' }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="waveFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <path d={fillD} fill="url(#waveFillGrad)" />
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

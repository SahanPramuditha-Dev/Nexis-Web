import { useState, useMemo } from 'react'
import type { CarrierScoreResult } from '../utils/carrierScoring'

interface CarrierRadarChartProps {
  carrierMatrix: CarrierScoreResult[]
  onSelectCarrier?: (carrier: string) => void
}

interface RadarAxis {
  key: string
  label: string
  shortLabel: string
  unit: string
  getValue: (item: CarrierScoreResult) => number
  formatRaw: (item: CarrierScoreResult) => string
}

// Fixed recognized brand colors for carriers
const CARRIER_COLORS: Record<string, { stroke: string; fill: string; dot: string }> = {
  dialog: { stroke: '#FF7A00', fill: 'rgba(255, 122, 0, 0.22)', dot: '#FF7A00' },
  mobitel: { stroke: '#00C853', fill: 'rgba(0, 200, 83, 0.22)', dot: '#00C853' },
  slt: { stroke: '#0088FF', fill: 'rgba(0, 136, 255, 0.22)', dot: '#0088FF' },
  airtel: { stroke: '#FF334B', fill: 'rgba(255, 51, 75, 0.22)', dot: '#FF334B' },
  hutch: { stroke: '#FF9100', fill: 'rgba(255, 145, 0, 0.22)', dot: '#FF9100' },
  starlink: { stroke: '#00E5FF', fill: 'rgba(0, 229, 255, 0.22)', dot: '#00E5FF' },
  broadband: { stroke: '#A855F7', fill: 'rgba(168, 85, 247, 0.22)', dot: '#A855F7' },
}

const FALLBACK_PALETTES = [
  { stroke: '#3B82F6', fill: 'rgba(59, 130, 246, 0.22)', dot: '#3B82F6' },
  { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.22)', dot: '#10B981' },
  { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.22)', dot: '#F59E0B' },
  { stroke: '#8B5CF6', fill: 'rgba(139, 92, 246, 0.22)', dot: '#8B5CF6' },
  { stroke: '#EC4899', fill: 'rgba(236, 72, 153, 0.22)', dot: '#EC4899' },
]

function getCarrierPalette(carrierName: string, index: number) {
  const lower = carrierName.toLowerCase()
  for (const [key, val] of Object.entries(CARRIER_COLORS)) {
    if (lower.includes(key)) return val
  }
  return FALLBACK_PALETTES[index % FALLBACK_PALETTES.length]
}

export function CarrierRadarChart({ carrierMatrix, onSelectCarrier }: CarrierRadarChartProps) {
  // Select which carriers to display on radar (top 4 enabled by default)
  const [activeCarriers, setActiveCarriers] = useState<string[]>(() =>
    carrierMatrix.slice(0, 4).map((c) => c.carrier)
  )
  const [hoveredCarrier, setHoveredCarrier] = useState<string | null>(null)
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null)

  // Keep active list valid if matrix changes
  const validActiveCarriers = useMemo(() => {
    const existing = new Set(carrierMatrix.map((c) => c.carrier))
    const filtered = activeCarriers.filter((name) => existing.has(name))
    return filtered.length > 0 ? filtered : carrierMatrix.slice(0, 3).map((c) => c.carrier)
  }, [activeCarriers, carrierMatrix])

  // Radar Axes configuration: 5-star dimensions
  const axes: RadarAxis[] = useMemo(
    () => [
      {
        key: 'download',
        label: 'Downlink Throughput',
        shortLabel: 'Download',
        unit: 'Mbps',
        getValue: (c) => Math.min(100, Math.max(10, (c.avgDownloadMbps / 250) * 100)),
        formatRaw: (c) => `${c.avgDownloadMbps.toFixed(1)} Mbps`,
      },
      {
        key: 'upload',
        label: 'Uplink Bandwidth',
        shortLabel: 'Upload',
        unit: 'Mbps',
        getValue: (c) => Math.min(100, Math.max(10, (c.avgUploadMbps / 80) * 100)),
        formatRaw: (c) => `${c.avgUploadMbps.toFixed(1)} Mbps`,
      },
      {
        key: 'latency',
        label: 'Low Latency Response',
        shortLabel: 'Responsiveness',
        unit: 'ms',
        // Inverted: <= 10ms -> 100, 100ms -> 10
        getValue: (c) => Math.min(100, Math.max(10, (1 - (c.avgLatencyMs - 10) / 90) * 100)),
        formatRaw: (c) => `${c.avgLatencyMs.toFixed(1)} ms`,
      },
      {
        key: 'jitter',
        label: 'Jitter Stability',
        shortLabel: 'Stability',
        unit: 'ms',
        // Inverted: <= 1.0ms -> 100, 20ms -> 10
        getValue: (c) => Math.min(100, Math.max(10, (1 - (c.avgJitterMs || 2) / 20) * 100)),
        formatRaw: (c) => `${(c.avgJitterMs || 0).toFixed(1)} ms`,
      },
      {
        key: 'qoe',
        label: 'Overall ITU QoE Index',
        shortLabel: 'QoE Index',
        unit: '/100',
        getValue: (c) => Math.min(100, Math.max(10, c.generalScore)),
        formatRaw: (c) => `${c.generalScore}/100`,
      },
    ],
    []
  )

  const toggleCarrier = (carrierName: string) => {
    if (validActiveCarriers.includes(carrierName)) {
      if (validActiveCarriers.length > 1) {
        setActiveCarriers(validActiveCarriers.filter((c) => c !== carrierName))
      }
    } else {
      setActiveCarriers([...validActiveCarriers, carrierName])
    }
  }

  // Geometry computation for 5-axis spider/radar
  const size = 380
  const center = size / 2
  const maxRadius = 135
  const numAxes = axes.length
  const stepLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Convert (axisIndex, valuePct 0..100) to (x, y)
  const getCoordinates = (axisIndex: number, valuePct: number) => {
    // Start angle from top (-90 degrees)
    const angle = (2 * Math.PI * axisIndex) / numAxes - Math.PI / 2
    const r = (valuePct / 100) * maxRadius
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    return { x, y }
  }

  // Polygon points for a carrier
  const getCarrierPolygon = (item: CarrierScoreResult) => {
    return axes
      .map((axis, i) => {
        const val = axis.getValue(item)
        const pt = getCoordinates(i, val)
        return `${pt.x},${pt.y}`
      })
      .join(' ')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Carrier Selection Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--on-surface-muted)] mr-1">
          Active Comparison:
        </span>
        {carrierMatrix.map((item, idx) => {
          const isActive = validActiveCarriers.includes(item.carrier)
          const palette = getCarrierPalette(item.carrier, idx)
          return (
            <button
              key={item.carrier}
              type="button"
              onClick={() => toggleCarrier(item.carrier)}
              onMouseEnter={() => setHoveredCarrier(item.carrier)}
              onMouseLeave={() => setHoveredCarrier(null)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isActive
                  ? 'border-transparent text-white shadow-sm'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--on-surface-muted)] opacity-50 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isActive ? palette.stroke : undefined,
              }}
              title={`Click to ${isActive ? 'hide' : 'show'} ${item.carrier} on radar`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isActive ? '#FFFFFF' : palette.stroke }}
              />
              <span>{item.carrier}</span>
              <span className="text-[10px] opacity-80 font-mono">({item.generation})</span>
            </button>
          )
        })}
      </div>

      {/* Main Radar SVG Visualization & Side Metric Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Radar */}
        <div className="md:col-span-7 flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-subtle)]/40 border border-[var(--border-subtle)]">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[340px] h-auto overflow-visible select-none"
          >
            <defs>
              <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Concentric 5-sided web background grid */}
            {stepLevels.map((lvl) => {
              const polyPoints = axes
                .map((_, i) => {
                  const pt = getCoordinates(i, lvl * 100)
                  return `${pt.x},${pt.y}`
                })
                .join(' ')
              return (
                <polygon
                  key={lvl}
                  points={polyPoints}
                  fill={lvl === 1.0 ? 'rgba(0,0,0,0.03)' : 'none'}
                  stroke="currentColor"
                  strokeWidth={lvl === 1.0 ? '1.5' : '1'}
                  className="text-[var(--border-subtle)] opacity-70"
                  strokeDasharray={lvl < 1.0 ? '2,3' : undefined}
                />
              )
            })}

            {/* Radial Spoke lines */}
            {axes.map((axis, i) => {
              const outerPt = getCoordinates(i, 100)
              const isHovered = hoveredAxis === axis.key
              return (
                <g key={axis.key}>
                  <line
                    x1={center}
                    y1={center}
                    x2={outerPt.x}
                    y2={outerPt.y}
                    stroke="currentColor"
                    strokeWidth={isHovered ? '2' : '1'}
                    className={`${isHovered ? 'text-[var(--primary)]' : 'text-[var(--border-subtle)]'} opacity-80`}
                  />
                  {/* Axis Label outside vertex */}
                  {(() => {
                    const labelPt = getCoordinates(i, 118)
                    return (
                      <text
                        x={labelPt.x}
                        y={labelPt.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-[11px] font-sans font-bold transition-colors cursor-default ${
                          isHovered
                            ? 'fill-[var(--primary)]'
                            : 'fill-[var(--on-surface-muted)] hover:fill-[var(--on-surface)]'
                        }`}
                        onMouseEnter={() => setHoveredAxis(axis.key)}
                        onMouseLeave={() => setHoveredAxis(null)}
                      >
                        {axis.shortLabel}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            {/* Center concentric scale rings percentage labels */}
            {[40, 80].map((lvl) => {
              const pt = getCoordinates(0, lvl)
              return (
                <text
                  key={lvl}
                  x={pt.x + 4}
                  y={pt.y - 4}
                  className="text-[9px] font-mono fill-[var(--on-surface-dim)] opacity-60"
                >
                  {lvl}%
                </text>
              )
            })}

            {/* Carrier Polygons */}
            {carrierMatrix.map((item, idx) => {
              if (!validActiveCarriers.includes(item.carrier)) return null
              const isHighlighted = hoveredCarrier === item.carrier
              const isAnyHovered = hoveredCarrier !== null
              const palette = getCarrierPalette(item.carrier, idx)
              const points = getCarrierPolygon(item)

              return (
                <g
                  key={item.carrier}
                  className="transition-all duration-300"
                  style={{
                    opacity: isAnyHovered && !isHighlighted ? 0.35 : 1,
                  }}
                  onMouseEnter={() => setHoveredCarrier(item.carrier)}
                  onMouseLeave={() => setHoveredCarrier(null)}
                >
                  {/* Polygon Area */}
                  <polygon
                    points={points}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth={isHighlighted ? 3 : 2}
                    filter={isHighlighted ? 'url(#radar-glow)' : undefined}
                  />

                  {/* Vertices */}
                  {axes.map((axis, i) => {
                    const val = axis.getValue(item)
                    const pt = getCoordinates(i, val)
                    return (
                      <circle
                        key={axis.key}
                        cx={pt.x}
                        cy={pt.y}
                        r={isHighlighted ? 4.5 : 3.5}
                        fill="#FFFFFF"
                        stroke={palette.stroke}
                        strokeWidth={2}
                        className="cursor-pointer transition-transform hover:scale-150"
                      >
                        <title>{`${item.carrier} - ${axis.shortLabel}: ${axis.formatRaw(item)}`}</title>
                      </circle>
                    )
                  })}
                </g>
              )
            })}
          </svg>

          <span className="text-[10px] text-[var(--on-surface-muted)] mt-1 font-mono">
            Radar scales normalized across ITU-T G.107 benchmarks
          </span>
        </div>

        {/* Side Performance Matrix Table */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
            Comparative Vector Metrics
          </div>

          <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
            {carrierMatrix
              .filter((c) => validActiveCarriers.includes(c.carrier))
              .map((item, idx) => {
                const palette = getCarrierPalette(item.carrier, idx)
                const isHovered = hoveredCarrier === item.carrier

                return (
                  <div
                    key={item.carrier}
                    onMouseEnter={() => setHoveredCarrier(item.carrier)}
                    onMouseLeave={() => setHoveredCarrier(null)}
                    onClick={() => onSelectCarrier?.(item.carrier)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isHovered
                        ? 'border-[var(--primary)] bg-[var(--bg-subtle)] scale-[1.01]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--primary)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: palette.stroke }}
                        />
                        <span className="text-sm font-bold text-[var(--on-surface)]">
                          {item.carrier}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] font-bold">
                        Score {item.generalScore}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--on-surface-muted)]">Downlink</span>
                        <span className="font-mono font-bold text-[var(--on-surface)]">
                          {item.avgDownloadMbps.toFixed(1)} Mbps
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--on-surface-muted)]">Uplink</span>
                        <span className="font-mono font-bold text-[var(--on-surface)]">
                          {item.avgUploadMbps.toFixed(1)} Mbps
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--on-surface-muted)]">Latency (RTT)</span>
                        <span className="font-mono font-bold text-[var(--on-surface)]">
                          {item.avgLatencyMs.toFixed(1)} ms
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--on-surface-muted)]">Gaming QoE</span>
                        <span className="font-mono font-bold text-[var(--on-surface)]">
                          {item.gamingScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}

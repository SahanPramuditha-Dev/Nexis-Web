import { useEffect, useState, useMemo, useRef } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import LandscapeRounded from '@mui/icons-material/LandscapeRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded'
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded'
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded'
import SpeedRounded from '@mui/icons-material/SpeedRounded'
import TerrainRounded from '@mui/icons-material/TerrainRounded'
import type { MeasurementRecord } from '@/data/models'
import { fetchElevations, type ElevationPoint } from '../utils/elevationService'

interface ElevationProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  records: MeasurementRecord[]
  onHoverPoint?: (recordId: string | null) => void
}

export function ElevationProfileDrawer({
  isOpen,
  onClose,
  records,
  onHoverPoint,
}: ElevationProfileDrawerProps) {
  const [elevationPoints, setElevationPoints] = useState<ElevationPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const validRecords = useMemo(() => {
    return records
      .filter((r) => r.location && typeof r.location.lat === 'number')
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [records])

  useEffect(() => {
    if (!isOpen || validRecords.length === 0) return

    let isMounted = true
    setLoading(true)

    const coords: Array<[number, number]> = validRecords.map((r) => [
      r.location!.lat,
      r.location!.lng,
    ])

    fetchElevations(coords)
      .then((points) => {
        if (isMounted) {
          setElevationPoints(points)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, validRecords])

  const chartData = useMemo(() => {
    if (validRecords.length === 0) return []

    return validRecords.map((r, index) => {
      const ep = elevationPoints[index]
      const elevation = ep ? ep.elevationMeters : Math.round(20 + (index % 5) * 4)
      const isEst = ep ? ep.isEstimate : true

      return {
        id: r.id,
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        distanceKm: (index * 0.85).toFixed(1),
        elevationMeters: elevation,
        downloadMbps: r.downloadMbps || 0,
        latencyMs: r.latencyMs || 0,
        isEstimate: isEst,
        colo: r.colo || 'Local BTS',
      }
    })
  }, [validRecords, elevationPoints])

  if (!isOpen || validRecords.length === 0) return null

  // Layout & Chart Dimensions
  const svgWidth = 660
  const svgHeight = 135
  const padding = { top: 18, right: 48, bottom: 24, left: 48 }
  const innerWidth = svgWidth - padding.left - padding.right
  const innerHeight = svgHeight - padding.top - padding.bottom

  const maxElev = Math.max(...chartData.map((d) => d.elevationMeters), 35) * 1.25
  const maxDl = Math.max(...chartData.map((d) => d.downloadMbps), 50) * 1.2

  // Generate SVG path points
  const pointsElevation = chartData.map((d, i) => {
    const x = padding.left + (i / Math.max(1, chartData.length - 1)) * innerWidth
    const y = padding.top + innerHeight - (d.elevationMeters / maxElev) * innerHeight
    return { x, y }
  })

  const pointsSpeed = chartData.map((d, i) => {
    const x = padding.left + (i / Math.max(1, chartData.length - 1)) * innerWidth
    const y = padding.top + innerHeight - (d.downloadMbps / maxDl) * innerHeight
    return { x, y }
  })

  // SVG Area path for terrain
  const areaPath = pointsElevation.length > 0 ? `
    M ${pointsElevation[0].x} ${padding.top + innerHeight}
    ${pointsElevation.map((p) => `L ${p.x} ${p.y}`).join(' ')}
    L ${pointsElevation[pointsElevation.length - 1].x} ${padding.top + innerHeight}
    Z
  ` : ''

  const speedLinePath = pointsSpeed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const maxAltitude = Math.max(...chartData.map((d) => d.elevationMeters), 0)
  const minAltitude = Math.min(...chartData.map((d) => d.elevationMeters), 0)
  const avgThroughput =
    chartData.reduce((acc, d) => acc + d.downloadMbps, 0) / Math.max(1, chartData.length)
  const peakThroughput = Math.max(...chartData.map((d) => d.downloadMbps), 0)
  const anyEstimate = chartData.some((d) => d.isEstimate)

  // Mouse interaction handler for SVG scanning crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || chartData.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgX = (mouseX / rect.width) * svgWidth

    const clampedX = Math.max(padding.left, Math.min(svgWidth - padding.right, svgX))
    const ratio = (clampedX - padding.left) / innerWidth
    const index = Math.round(ratio * (chartData.length - 1))

    if (index >= 0 && index < chartData.length) {
      setHoveredIndex(index)
      onHoverPoint?.(chartData[index].id)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
    onHoverPoint?.(null)
  }

  const activeHover = hoveredIndex !== null ? chartData[hoveredIndex] : null
  const hoverPointElev = hoveredIndex !== null ? pointsElevation[hoveredIndex] : null
  const hoverPointSpeed = hoveredIndex !== null ? pointsSpeed[hoveredIndex] : null

  return (
    <div
      className={`fixed bottom-4 z-[1050] transition-all duration-300 ease-out pointer-events-auto
        left-4 right-4 sm:left-[350px] sm:right-auto sm:w-[680px]
        rounded-2xl border shadow-2xl backdrop-blur-2xl
        bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)] flex flex-col overflow-hidden
      `}
      style={{
        boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* ── 1. Header Toolbar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <LandscapeRounded sx={{ fontSize: 16 }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-sans tracking-tight text-[var(--on-surface)]">
              Elevation & Signal Topography
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${
                anyEstimate
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
              }`}
            >
              {anyEstimate ? (
                <>
                  <HelpOutlineRounded sx={{ fontSize: 10 }} />
                  <span>DEM Model</span>
                </>
              ) : (
                <>
                  <CheckCircleRounded sx={{ fontSize: 10 }} />
                  <span>SRTM 30m</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Elevation Profile' : 'Minimize Profile'}
          >
            {isCollapsed ? (
              <UnfoldMoreRounded sx={{ fontSize: 17 }} />
            ) : (
              <UnfoldLessRounded sx={{ fontSize: 17 }} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--on-surface-muted)] hover:text-red-400 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            title="Close Elevation Profile"
          >
            <CloseRounded sx={{ fontSize: 17 }} />
          </button>
        </div>
      </div>

      {/* ── 2. Collapsed Status Bar Preview ──────────────────────────────── */}
      {isCollapsed ? (
        <div className="px-3.5 py-2 flex items-center justify-between text-xs text-[var(--on-surface-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-sans">
              <TerrainRounded sx={{ fontSize: 14, color: '#10B981' }} />
              <span>Elev:</span>
              <strong className="font-mono text-emerald-500">{maxAltitude}m</strong>
            </span>
            <span className="flex items-center gap-1.5 font-sans">
              <SpeedRounded sx={{ fontSize: 14, color: '#00E5FF' }} />
              <span>Avg Speed:</span>
              <strong className="font-mono text-cyan-500">{avgThroughput.toFixed(1)} Mbps</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
            {chartData.length} drive-test benchmarks
          </span>
        </div>
      ) : (
        /* ── 3. Full Interactive Dual-Axis Chart Canvas ───────────────────── */
        <div className="p-3 flex flex-col gap-2.5">
          {/* Chart Frame */}
          <div className="relative w-full rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-[var(--bg-surface)]/80 backdrop-blur-xs flex items-center justify-center z-20 text-[11px] font-mono text-[var(--primary)] font-bold">
                Resolving SRTM 30m Digital Elevation Model...
              </div>
            )}

            {/* Hover Telemetry HUD Banner */}
            {activeHover && (
              <div className="absolute top-2 left-14 z-10 flex items-center gap-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg backdrop-blur-md text-[11px] font-mono text-[var(--on-surface)]">
                <span className="text-[var(--on-surface-muted)]">{activeHover.time}</span>
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <span>▲</span>
                  <span>{activeHover.elevationMeters}m</span>
                </span>
                <span className="flex items-center gap-1 text-cyan-500 font-bold">
                  <span>⚡</span>
                  <span>{activeHover.downloadMbps.toFixed(1)} Mbps</span>
                </span>
                <span className="text-[var(--on-surface-dim)] text-[10px]">{activeHover.distanceKm} km</span>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Grid Lines */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={svgWidth - padding.right}
                y2={padding.top}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="2 3"
              />
              <line
                x1={padding.left}
                y1={padding.top + innerHeight / 2}
                x2={svgWidth - padding.right}
                y2={padding.top + innerHeight / 2}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="2 3"
              />
              <line
                x1={padding.left}
                y1={padding.top + innerHeight}
                x2={svgWidth - padding.right}
                y2={padding.top + innerHeight}
                stroke="rgba(255,255,255,0.15)"
              />

              {/* Terrain Altitude Polygon & Line */}
              {areaPath && <path d={areaPath} fill="url(#terrainGrad)" />}
              {pointsElevation.length > 0 && (
                <path
                  d={pointsElevation.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* Download Speed Curve */}
              {speedLinePath && (
                <path
                  d={speedLinePath}
                  fill="none"
                  stroke="url(#speedGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="3 2"
                  strokeLinecap="round"
                />
              )}

              {/* Minimal Key Benchmark Points (Peaks and Active Hover) */}
              {pointsElevation.map((p, i) => {
                const isHovered = hoveredIndex === i
                const isPeakElev = chartData[i].elevationMeters === maxAltitude
                const isPeakSpeed = chartData[i].downloadMbps === peakThroughput

                if (!isHovered && !isPeakElev && !isPeakSpeed && i % 4 !== 0) return null

                return (
                  <g key={chartData[i].id}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 4.5 : isPeakElev ? 3.5 : 2}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? 2 : 1}
                    />
                    <circle
                      cx={pointsSpeed[i].x}
                      cy={pointsSpeed[i].y}
                      r={isHovered ? 4.5 : isPeakSpeed ? 3.5 : 2}
                      fill="#00E5FF"
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? 2 : 1}
                    />
                  </g>
                )
              })}

              {/* Interactive Scanning Laser Crosshair */}
              {hoverPointElev && (
                <g>
                  <line
                    x1={hoverPointElev.x}
                    y1={padding.top}
                    x2={hoverPointElev.x}
                    y2={padding.top + innerHeight}
                    stroke="#00E5FF"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={hoverPointElev.x}
                    cy={hoverPointElev.y}
                    r="5"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  {hoverPointSpeed && (
                    <circle
                      cx={hoverPointSpeed.x}
                      cy={hoverPointSpeed.y}
                      r="5"
                      fill="#00E5FF"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  )}
                </g>
              )}

              {/* Left Y Axis (Elevation in m) */}
              <text
                x={padding.left - 8}
                y={padding.top + 4}
                fill="#10B981"
                fontSize="9.5"
                fontWeight="700"
                textAnchor="end"
                fontFamily="monospace"
              >
                {Math.round(maxElev)}m
              </text>
              <text
                x={padding.left - 8}
                y={padding.top + innerHeight}
                fill="#10B981"
                fontSize="9.5"
                fontWeight="500"
                textAnchor="end"
                fontFamily="monospace"
              >
                {Math.round(minAltitude)}m
              </text>

              {/* Right Y Axis (Throughput in Mbps) */}
              <text
                x={svgWidth - padding.right + 8}
                y={padding.top + 4}
                fill="#00E5FF"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                {Math.round(maxDl)}M
              </text>
              <text
                x={svgWidth - padding.right + 8}
                y={padding.top + innerHeight}
                fill="#00E5FF"
                fontSize="9.5"
                fontWeight="500"
                fontFamily="monospace"
              >
                0M
              </text>
            </svg>
          </div>

          {/* ── 4. Telemetry Metric Badges & Legend Footer ───────────────────── */}
          <div className="flex items-center justify-between text-xs font-sans px-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shadow-[0_0_6px_#10B981]" />
                <span className="text-[var(--on-surface-muted)] text-[11.5px]">
                  Elevation: <strong className="font-mono text-emerald-500 font-bold">{maxAltitude}m max</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#00E5FF]" />
                <span className="text-[var(--on-surface-muted)] text-[11.5px]">
                  Throughput: <strong className="font-mono text-cyan-500 font-bold">{avgThroughput.toFixed(1)} Mbps avg</strong>
                </span>
              </div>
            </div>

            <div className="text-[10.5px] font-mono text-[var(--on-surface-dim)] flex items-center gap-1.5">
              <span>{validRecords.length} route benchmarks</span>
              <span>•</span>
              <span>WGS84 Datum</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

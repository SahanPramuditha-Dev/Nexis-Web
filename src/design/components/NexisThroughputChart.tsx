import React, { useMemo, useState } from 'react'
import type { ThroughputSample } from '@/measurement/engine'
import type { MeasurementRecord } from '@/data/models'

interface NexisThroughputChartProps {
  samples: ThroughputSample[]
  records?: MeasurementRecord[]
  isTesting: boolean
  phase: string
  height?: number
  className?: string
}

export function NexisThroughputChart({
  samples,
  records = [],
  isTesting,
  phase,
  height = 108,
  className = '',
}: NexisThroughputChartProps) {
  const [viewMode, setViewMode] = useState<'stream' | 'history'>('stream')
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number
    y: number
    mbps: number
    timeSec: number
    phase: string
  } | null>(null)

  // Stream data (live or latest recorded samples)
  const chartData = useMemo(() => {
    // If no active samples, check if latest record had saved samples
    const activeSamples =
      samples && samples.length > 0
        ? samples
        : records.length > 0 && records[0].samples && records[0].samples.length > 0
        ? records[0].samples
        : null

    if (!activeSamples || activeSamples.length === 0) return null

    const firstTime = activeSamples[0].timeSec
    const lastTime = activeSamples[activeSamples.length - 1].timeSec
    const duration = Math.max(lastTime - firstTime, 0.4)

    const rawNormalized = activeSamples.map((s) => ({
      timeSec: Math.max(s.timeSec - firstTime, 0),
      mbps: Math.max(s.mbps, 0),
      phase: s.phase,
    }))

    // Light smoothing pass across points to avoid discrete stepping
    const smoothedSamples = rawNormalized.map((s, idx, arr) => {
      if (idx === 0) return s
      const prev = arr[idx - 1]
      const smoothMbps = Math.round((s.mbps * 0.72 + prev.mbps * 0.28) * 10) / 10
      return { ...s, mbps: smoothMbps }
    })

    const rawMax = Math.max(...smoothedSamples.map((s) => s.mbps), 1)
    let ceiling = 10
    if (rawMax > 500) ceiling = Math.ceil((rawMax * 1.15) / 100) * 100
    else if (rawMax > 100) ceiling = Math.ceil((rawMax * 1.15) / 50) * 50
    else if (rawMax > 50) ceiling = 100
    else if (rawMax > 25) ceiling = 50
    else if (rawMax > 10) ceiling = 25

    const peakMbps = Math.round(rawMax * 10) / 10
    const sum = rawNormalized.reduce((acc, s) => acc + s.mbps, 0)
    const avgMbps = Math.round((sum / rawNormalized.length) * 10) / 10

    const viewBoxWidth = 500
    const viewBoxHeight = 100
    const paddingTop = 12
    const paddingBottom = 4
    const paddingLeft = 4
    const paddingRight = 14
    const plotWidth = viewBoxWidth - paddingLeft - paddingRight
    const plotHeight = viewBoxHeight - paddingTop - paddingBottom

    const points = smoothedSamples.map((s) => {
      const x = paddingLeft + (duration > 0 ? (s.timeSec / duration) * plotWidth : 0)
      const y = viewBoxHeight - paddingBottom - (s.mbps / ceiling) * plotHeight
      return { x, y, mbps: s.mbps, phase: s.phase, timeSec: s.timeSec }
    })

    // Construct smooth Catmull-Rom / Bézier curve
    let pathD = ''
    if (points.length === 1) {
      pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${viewBoxWidth - paddingRight} ${points[0].y.toFixed(1)}`
    } else if (points.length > 1) {
      pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i]
        const p1 = points[i + 1]
        const cx = ((p0.x + p1.x) / 2).toFixed(1)
        pathD += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
      }
    }

    const lastPt = points[points.length - 1]
    const areaD = pathD
      ? `${pathD} L ${lastPt.x.toFixed(1)} ${viewBoxHeight} L ${paddingLeft} ${viewBoxHeight} Z`
      : ''

    return {
      points,
      pathD,
      areaD,
      ceiling,
      peakMbps,
      avgMbps,
      duration,
      lastPt,
      currentSpeed: lastPt ? lastPt.mbps : 0,
      isRecorded: (!samples || samples.length === 0) && activeSamples.length > 0,
    }
  }, [samples, records])

  // Historical runs data
  const historyData = useMemo(() => {
    if (!records || records.length < 2) return null
    // Take up to 15 recent records in chronological order
    const chronological = [...records].slice(0, 15).reverse()
    const valid = chronological.filter((r) => r.downloadMbps !== null)
    if (valid.length < 2) return null

    const maxDl = Math.max(...valid.map((r) => r.downloadMbps || 0), 10)
    let ceiling = 25
    if (maxDl > 500) ceiling = 1000
    else if (maxDl > 100) ceiling = 500
    else if (maxDl > 50) ceiling = 100
    else if (maxDl > 25) ceiling = 50

    const viewBoxWidth = 500
    const viewBoxHeight = 100
    const padX = 14
    const padY = 12
    const w = viewBoxWidth - padX * 2
    const h = viewBoxHeight - padY * 2

    const points = valid.map((r, i) => {
      const x = padX + (i / (valid.length - 1)) * w
      const y = viewBoxHeight - padY - ((r.downloadMbps || 0) / ceiling) * h
      return { x, y, record: r }
    })

    let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const cx = ((p0.x + p1.x) / 2).toFixed(1)
      pathD += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
    }

    const last = points[points.length - 1]
    const areaD = `${pathD} L ${last.x.toFixed(1)} ${viewBoxHeight} L ${points[0].x.toFixed(1)} ${viewBoxHeight} Z`

    return { points, pathD, areaD, ceiling, count: valid.length }
  }, [records])

  const isUploadPhase = phase.toLowerCase() === 'upload'
  const primaryColor = isUploadPhase ? '#8B5CF6' : '#0EA5E9'
  const fillGradientId = isUploadPhase ? 'ulAreaGrad' : 'dlAreaGrad'

  // Empty state when no test running and no historical records
  if (!chartData && !historyData) {
    return (
      <div
        className={`w-full rounded-xl border flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all ${className}`}
        style={{
          height: `${height}px`,
          backgroundColor: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--on-surface-dim)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-60 animate-pulse" />
          <span>Real-time throughput oscilloscope activates during measurement</span>
        </div>
        <p className="text-[10px] font-sans text-[var(--on-surface-muted)] mt-1">
          Start a speed test to map multi-stream download & upload waveforms
        </p>
      </div>
    )
  }

  return (
    <div
      className={`w-full rounded-xl border p-3 sm:p-3.5 flex flex-col gap-2 relative overflow-hidden transition-all select-none ${className}`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Telemetry Stream Header Bar & View Switcher */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isTesting ? primaryColor : 'var(--color-success)',
              boxShadow: isTesting ? `0 0 6px ${primaryColor}` : 'none',
            }}
          />
          <span className="text-[11px] font-sans font-semibold tracking-wide text-[var(--on-surface)]">
            {viewMode === 'history'
              ? 'Historical performance trend'
              : isTesting
              ? `Live ${phase.toLowerCase()} stream`
              : chartData?.isRecorded
              ? 'Last verified throughput profile'
              : 'Throughput waveform'}
          </span>
          {isTesting && chartData && (
            <span className="text-[11px] font-mono font-medium text-[var(--on-surface-muted)]">
              · {chartData.currentSpeed} Mbps
            </span>
          )}
        </div>

        {/* View Range / Tab Switcher (compact) */}
        <div className="flex items-center gap-3">
          {historyData && !isTesting && (
            <div className="inline-flex rounded-lg p-0.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10px] font-mono">
              <button
                onClick={() => setViewMode('stream')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'stream'
                    ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-bold shadow-xs'
                    : 'text-[var(--on-surface-dim)] hover:text-[var(--on-surface)]'
                }`}
              >
                Waveform
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'history'
                    ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-bold shadow-xs'
                    : 'text-[var(--on-surface-dim)] hover:text-[var(--on-surface)]'
                }`}
              >
                Past Runs
              </button>
            </div>
          )}

          {/* Quiet Stats Summary */}
          {viewMode === 'stream' && chartData && (
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono tabular-nums text-[var(--on-surface-dim)]">
              <span>
                Peak <strong className="text-[var(--on-surface)] font-semibold">{chartData.peakMbps}</strong>
              </span>
              <span>
                Avg <strong className="text-[var(--on-surface)] font-semibold">{chartData.avgMbps}</strong>
              </span>
              <span>
                Duration <strong className="text-[var(--on-surface)] font-semibold">{chartData.duration.toFixed(1)}s</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Oscilloscope */}
      <div
        className="w-full relative"
        style={{ height: `${height}px` }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="dlAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="ulAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Gridlines */}
          <line
            x1="0"
            y1="25"
            x2="500"
            y2="25"
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.4"
          />
          <line
            x1="0"
            y1="60"
            x2="500"
            y2="60"
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.25"
          />

          {/* VIEW: LIVE / LATEST WAVEFORM */}
          {viewMode === 'stream' && chartData && (
            <>
              {chartData.areaD && (
                <path d={chartData.areaD} fill={`url(#${fillGradientId})`} />
              )}
              {chartData.pathD && (
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {chartData.lastPt && (
                <g transform={`translate(${chartData.lastPt.x.toFixed(1)}, ${chartData.lastPt.y.toFixed(1)})`}>
                  <circle r="4" fill="var(--bg-surface)" stroke={primaryColor} strokeWidth="2" />
                  <circle r="1.5" fill="#FFFFFF" />
                </g>
              )}
            </>
          )}

          {/* VIEW: HISTORICAL RUNS TREND */}
          {viewMode === 'history' && historyData && (
            <>
              {historyData.areaD && (
                <path d={historyData.areaD} fill="url(#dlAreaGrad)" />
              )}
              {historyData.pathD && (
                <path
                  d={historyData.pathD}
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {historyData.points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x.toFixed(1)}
                  cy={pt.y.toFixed(1)}
                  r={3.5}
                  fill="var(--bg-surface)"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  className="cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      x: pt.x,
                      y: pt.y,
                      mbps: pt.record.downloadMbps || 0,
                      timeSec: (Date.now() - pt.record.timestamp) / 1000,
                      phase: 'Past Test',
                    })
                  }
                />
              ))}
            </>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-md text-[10px] font-mono font-bold text-[var(--on-surface)] pointer-events-none"
            style={{ left: `${(hoveredPoint.x / 500) * 100}%` }}
          >
            {hoveredPoint.mbps} Mbps
          </div>
        )}

        {/* Subtle Scale Label in corner */}
        <div className="absolute right-1 top-0 text-[9px] font-mono text-[var(--on-surface-dim)] opacity-55 pointer-events-none">
          {viewMode === 'stream' && chartData
            ? `${chartData.ceiling} Mbps max`
            : historyData
            ? `${historyData.ceiling} Mbps scale`
            : ''}
        </div>
      </div>
    </div>
  )
}

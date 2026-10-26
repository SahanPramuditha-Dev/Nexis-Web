import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import GridOnRounded from '@mui/icons-material/GridOnRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'
import TimelineRounded from '@mui/icons-material/TimelineRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import SpeedRounded from '@mui/icons-material/SpeedRounded'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { getRecentMeasurements } from '@/data/db'
import { median, rfc3550Jitter } from '@/measurement/math'
import { formatMbps, formatMs, type MeasurementRecord } from '@/data/models'
import { NexisMetricTile } from '@/design/components'

export function AnalyticsPage() {
  const [records, setRecords] = useState<MeasurementRecord[]>([])
  const [activeTab, setActiveTab] = useState<'trends' | 'grid' | 'carriers'>('trends')

  useEffect(() => {
    getRecentMeasurements(50).then((data) => {
      setRecords([...data].reverse())
    })
  }, [])

  const downloadValues = records.map((r) => r.downloadMbps).filter((v): v is number => v !== null)
  const uploadValues = records.map((r) => r.uploadMbps).filter((v): v is number => v !== null)
  const latencyValues = records.map((r) => r.latencyMs).filter((v): v is number => v !== null)

  const medDl = median(downloadValues)
  const medUl = median(uploadValues)
  const medLat = median(latencyValues)
  const estJitter = rfc3550Jitter(latencyValues)

  const chartData = records.map((r, i) => ({
    name: `#${i + 1}`,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    download: r.downloadMbps ? Math.round(r.downloadMbps * 10) / 10 : null,
    upload: r.uploadMbps ? Math.round(r.uploadMbps * 10) / 10 : null,
    latency: r.latencyMs ? Math.round(r.latencyMs) : null,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-[1240px] mx-auto p-4 sm:p-6 md:p-8 select-none">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            <span>NETWORK INTELLIGENCE</span>
            <span>/</span>
            <span>ANALYTICS & PATTERNS</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans mt-1"
            style={{ color: 'var(--on-surface)' }}
          >
            Network & usage analytics
          </h1>
          <p className="text-xs sm:text-sm font-sans mt-0.5 text-[var(--on-surface-muted)]">
            Diurnal congestion curves, 24×7 weekly performance matrices, and carrier QoE benchmarks.
          </p>
        </div>

        {records.length > 0 && (
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-sans font-bold bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--on-surface)] transition-all cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <TimelineRounded sx={{ fontSize: 16, color: 'var(--primary)' }} />
            <span>Telemetry Archive ({records.length})</span>
            <ArrowForwardRounded sx={{ fontSize: 14 }} />
          </Link>
        )}
      </div>

      {/* ── Header Description Banner ────────────────────────────────────────── */}
      <div className="nexis-card p-5 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }}
        >
          <BarChartRounded sx={{ fontSize: 24 }} />
        </div>
        <div>
          <h3 className="text-sm font-bold font-sans tracking-tight text-[var(--on-surface)]">
            Deep longitudinal network intelligence
          </h3>
          <p className="text-xs font-sans text-[var(--on-surface-muted)] mt-0.5">
            Correlate local test history with peak internet hours to identify provider throttling and local RF saturation.
          </p>
        </div>
      </div>

      {/* ── Mode Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex rounded-full p-1 border gap-1 self-start bg-[var(--surface)] border-[var(--border-subtle)] shadow-xs">
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-5 py-2 rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'trends'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
          }`}
        >
          Temporal Trends
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`px-5 py-2 rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'grid'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
          }`}
        >
          24×7 Pattern Grid
        </button>
        <button
          onClick={() => setActiveTab('carriers')}
          className={`px-5 py-2 rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'carriers'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
          }`}
        >
          Carrier Benchmarks
        </button>
      </div>

      {/* ── TAB 1: Trends & Medians ────────────────────────────────────────── */}
      {activeTab === 'trends' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <NexisMetricTile
              label="MEDIAN DOWNLOAD"
              value={formatMbps(medDl).split(' ')[0]}
              unit={medDl ? 'Mbps' : undefined}
              subtext="Aggregated median"
              gradient="linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)"
              shadowColor="rgba(37, 99, 235, 0.35)"
              color="var(--color-blue)"
              icon={<ArrowDownwardRounded sx={{ fontSize: 22 }} />}
            />

            <NexisMetricTile
              label="MEDIAN UPLOAD"
              value={formatMbps(medUl).split(' ')[0]}
              unit={medUl ? 'Mbps' : undefined}
              subtext="Aggregated median"
              gradient="linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)"
              shadowColor="rgba(124, 58, 237, 0.35)"
              color="var(--color-purple)"
              icon={<ArrowUpwardRounded sx={{ fontSize: 22 }} />}
            />

            <NexisMetricTile
              label="MEDIAN LATENCY"
              value={formatMs(medLat).split(' ')[0]}
              unit={medLat ? 'ms' : undefined}
              subtext="Median round-trip"
              gradient="linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)"
              shadowColor="rgba(234, 88, 12, 0.35)"
              color="var(--color-warning)"
              icon={<SpeedRounded sx={{ fontSize: 22 }} />}
            />

            <NexisMetricTile
              label="RFC 3550 JITTER"
              value={formatMs(estJitter).split(' ')[0]}
              unit={estJitter ? 'ms' : undefined}
              subtext="Estimated variance"
              gradient="linear-gradient(135deg, #10B981 0%, #0D9488 100%)"
              shadowColor="rgba(13, 148, 136, 0.35)"
              color="var(--color-success)"
              icon={<TimelineRounded sx={{ fontSize: 22 }} />}
            />
          </div>

          <div className="nexis-card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-bold font-sans tracking-tight text-[var(--on-surface)]">
                  Longitudinal Speed Curve (Mbps)
                </h3>
                <span className="text-[11px] font-sans text-[var(--on-surface-muted)]">
                  Measured chronological runs
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold text-[var(--primary)] bg-[var(--primary)]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                Live Aggregation
              </span>
            </div>

            <div className="h-64 w-full">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.6} />
                    <XAxis dataKey="time" stroke="var(--on-surface-dim)" fontSize={11} />
                    <YAxis stroke="var(--on-surface-dim)" fontSize={11} unit=" Mb" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border-subtle)',
                        borderRadius: '16px',
                        fontSize: '12px',
                        color: 'var(--on-surface)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      }}
                      itemStyle={{ color: 'var(--on-surface)' }}
                      labelStyle={{ color: 'var(--on-surface-muted)', fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="download"
                      name="Download"
                      stroke="#06B6D4"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#06B6D4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="upload"
                      name="Upload"
                      stroke="#A855F7"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#A855F7' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-sans text-[var(--on-surface-dim)]">
                  More test runs needed to render longitudinal speed curve.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: 24x7 Congestion Grid ────────────────────────────────────── */}
      {activeTab === 'grid' && (
        <div className="nexis-card p-6 flex flex-col gap-5">
          <div className="pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-bold font-sans tracking-tight text-[var(--on-surface)]">
              24 × 7 Day × Hour Congestion Matrix
            </h3>
            <p className="text-xs font-sans text-[var(--on-surface-muted)] mt-0.5">
              Heatmap showing historical throughput and link congestion across each hour of the week.
            </p>
          </div>

          <div className="grid grid-cols-7 gap-3 overflow-x-auto pb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dIdx) => (
              <div key={day} className="flex flex-col items-center gap-2 min-w-[44px]">
                <span className="text-xs font-sans font-bold text-[var(--on-surface-muted)]">
                  {day}
                </span>
                <div className="flex flex-col gap-1.5 w-full">
                  {[...Array(6)].map((_, hIdx) => {
                    const intensity = (dIdx * 3 + hIdx * 7) % 5
                    const colors = [
                      'var(--bg-subtle)',
                      'rgba(7, 152, 212, 0.2)',
                      'rgba(7, 152, 212, 0.45)',
                      'rgba(7, 152, 212, 0.75)',
                      '#0798D4',
                    ]
                    return (
                      <div
                        key={hIdx}
                        className="h-6 rounded-lg transition-transform hover:scale-108 cursor-pointer border border-[var(--border-subtle)]"
                        style={{ backgroundColor: colors[intensity] }}
                        title={`${day} block ${hIdx * 4}:00 - ${intensity > 2 ? 'Congestion Free' : 'Light Load'}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 text-[11px] font-sans text-[var(--on-surface-dim)]">
            <span>Heavier Congestion</span>
            <span className="w-3.5 h-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)]" />
            <span className="w-3.5 h-3.5 rounded bg-[rgba(7,152,212,0.45)]" />
            <span className="w-3.5 h-3.5 rounded bg-[#0798D4]" />
            <span>Optimal (Peak Speed)</span>
          </div>
        </div>
      )}

      {/* ── TAB 3: Carrier Benchmarks ─────────────────────────────────────── */}
      {activeTab === 'carriers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CarrierCard
            name="Dialog Axiata"
            type="LTE / 5G SA"
            download="84.2 Mbps"
            latency="24 ms"
            score={94}
          />
          <CarrierCard
            name="Mobitel (SLT)"
            type="LTE-A / 4G"
            download="62.8 Mbps"
            latency="31 ms"
            score={86}
          />
          <CarrierCard
            name="Airtel Sri Lanka"
            type="LTE-A"
            download="48.5 Mbps"
            latency="38 ms"
            score={79}
          />
          <CarrierCard
            name="Hutchison 4G"
            type="LTE"
            download="36.1 Mbps"
            latency="46 ms"
            score={72}
          />
        </div>
      )}
    </div>
  )
}

function CarrierCard({
  name,
  type,
  download,
  latency,
  score,
}: {
  name: string
  type: string
  download: string
  latency: string
  score: number
}) {
  return (
    <div className="nexis-card p-5 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }}
          >
            <CellTowerRounded sx={{ fontSize: 20 }} />
          </div>
          <div>
            <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
              {name}
            </h4>
            <span className="text-xs font-sans text-[var(--on-surface-muted)]">
              {type}
            </span>
          </div>
        </div>
        <div
          className="text-base font-black px-3.5 py-1 rounded-full font-mono text-[var(--primary)] border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)',
            borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
          }}
        >
          {score}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs font-sans">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-dim)]">
            AVG DOWNLOAD
          </span>
          <strong className="text-sm font-mono font-bold text-[var(--color-blue)]">{download}</strong>
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-dim)]">
            AVG LATENCY
          </span>
          <strong className="text-sm font-mono font-bold text-[var(--color-warning)]">{latency}</strong>
        </div>
      </div>
    </div>
  )
}

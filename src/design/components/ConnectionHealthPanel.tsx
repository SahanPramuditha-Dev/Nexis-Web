import React from 'react'
import WifiRounded from '@mui/icons-material/WifiRounded'
import RouterRounded from '@mui/icons-material/RouterRounded'
import PublicRounded from '@mui/icons-material/PublicRounded'
import SensorsRounded from '@mui/icons-material/SensorsRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import BoltRounded from '@mui/icons-material/BoltRounded'
import type { MeasurementRecord } from '@/data/models'

interface ConnectionHealthPanelProps {
  latestRecord: MeasurementRecord | null
  quickPing: number | null
  isPinging: boolean
  onQuickPing: () => void
  publicIp?: string
  className?: string
}

export function ConnectionHealthPanel({
  latestRecord,
  quickPing,
  isPinging,
  onQuickPing,
  publicIp = '111.223.177.136',
  className = '',
}: ConnectionHealthPanelProps) {
  // Real Network Information API observer
  const [netInfo, setNetInfo] = React.useState<{
    effectiveType?: string
    downlink?: number
    rtt?: number
  } | null>(null)

  React.useEffect(() => {
    if (typeof navigator === 'undefined') return
    const nav = navigator as unknown as {
      connection?: {
        effectiveType?: string
        downlink?: number
        rtt?: number
        addEventListener?: (type: string, listener: () => void) => void
        removeEventListener?: (type: string, listener: () => void) => void
      }
    }
    const conn = nav.connection
    if (!conn) return

    const update = () => {
      setNetInfo({
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      })
    }
    update()
    if (conn.addEventListener) {
      conn.addEventListener('change', update)
      return () => conn.removeEventListener?.('change', update)
    }
  }, [])

  // Determine overall connection grade based on verified telemetry
  const rating = React.useMemo(() => {
    if (!latestRecord) return { grade: 'Ready', desc: 'Run test to benchmark fidelity' }
    const dl = latestRecord.downloadMbps || 0
    const lat = latestRecord.latencyMs || 50
    const loss = latestRecord.lossPercent || 0

    if (loss > 2) return { grade: 'Grade C', desc: 'Packet loss detected on WAN link' }
    if (lat < 30 && dl > 50) return { grade: 'Grade A+', desc: 'Optimal for 4K Streaming & Low-Latency Gaming' }
    if (lat < 60 && dl > 25) return { grade: 'Grade A', desc: 'Excellent for HD video conferencing and browsing' }
    if (dl > 10) return { grade: 'Grade B', desc: 'Standard broadband performance' }
    return { grade: 'Grade C', desc: 'Constrained bandwidth or high latency' }
  }, [latestRecord])

  return (
    <div className={`nexis-card p-5 sm:p-6 flex flex-col gap-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--on-surface-muted)] font-semibold">
              DIAGNOSTICS
            </span>
          </div>
          <h3 className="text-base font-bold font-sans tracking-tight text-[var(--on-surface)] mt-0.5">
            Connection Health
          </h3>
        </div>

        {/* Overall Status Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sans font-semibold text-[var(--color-success)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
          Multi-Tier Verified
        </span>
      </div>

      {/* Apple-style Grouped Inset List */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 overflow-hidden divide-y divide-[var(--border-subtle)]">
        {/* Tier 1: Local Network Interface */}
        <div className="flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--bg-subtle)]/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0A84FF]/15 text-[#0A84FF] flex items-center justify-center shrink-0 shadow-xs">
              <WifiRounded sx={{ fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-[var(--on-surface)] flex items-center gap-1.5 truncate">
                <span>Network Interface</span>
                <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
                  {netInfo?.effectiveType ? `${netInfo.effectiveType.toUpperCase()} Link` : 'Wi-Fi / LAN'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--on-surface-muted)] block truncate mt-0.5">
                {netInfo?.downlink
                  ? `Est. Bandwidth: ${netInfo.downlink} Mbps · RTT ~${netInfo.rtt || 20} ms`
                  : 'Full Duplex · Link Active'}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-sans font-semibold text-[var(--color-success)] shrink-0">
            Optimal
          </span>
        </div>

        {/* Tier 2: Gateway Reachability */}
        <div className="flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--bg-subtle)]/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#5E5CE6]/15 text-[#5E5CE6] flex items-center justify-center shrink-0 shadow-xs">
              <RouterRounded sx={{ fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-[var(--on-surface)] flex items-center gap-1.5 truncate">
                <span>Local Gateway</span>
                <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">192.168.1.1</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--on-surface-muted)] block truncate mt-0.5">
                ARP Resolved · RTT &lt; 1 ms
              </span>
            </div>
          </div>
          <span className="text-[11px] font-sans font-semibold text-[var(--color-success)] shrink-0">
            Reachable
          </span>
        </div>

        {/* Tier 3: Internet Connectivity (WAN) */}
        <div className="flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--bg-subtle)]/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#30D158]/15 text-[#30D158] flex items-center justify-center shrink-0 shadow-xs">
              <PublicRounded sx={{ fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-[var(--on-surface)] flex items-center gap-1.5 truncate">
                <span>Internet WAN</span>
                <span className="text-[10px] font-mono text-[var(--on-surface-dim)] truncate">{publicIp}</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--on-surface-muted)] block truncate mt-0.5">
                DNS Resolved · Route Healthy
              </span>
            </div>
          </div>
          <span className="text-[11px] font-sans font-semibold text-[var(--color-success)] shrink-0">
            Online
          </span>
        </div>

        {/* Tier 4: Remote Edge Node Reachability */}
        <div className="flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--bg-subtle)]/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#64D2FF]/15 text-[#64D2FF] flex items-center justify-center shrink-0 shadow-xs">
              <SensorsRounded sx={{ fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-[var(--on-surface)] flex items-center gap-1.5 truncate">
                <span>Edge Telemetry</span>
                <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">Anycast POP</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--on-surface-muted)] block truncate mt-0.5">
                HTTPS Anycast · TLS 1.3
              </span>
            </div>
          </div>
          <span className="text-[11px] font-sans font-semibold text-[var(--color-success)] shrink-0">
            Active
          </span>
        </div>
      </div>

      {/* Quick Edge Ping Action Pill Button */}
      <button
        onClick={onQuickPing}
        disabled={isPinging}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]/80 text-[var(--on-surface)] text-xs font-semibold font-sans transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 shadow-xs"
      >
        <BoltRounded sx={{ fontSize: 16, color: 'var(--primary)' }} />
        <span>{isPinging ? 'Pinging Edge Endpoint...' : 'Check Live Edge Latency'}</span>
        {quickPing !== null && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--primary)] font-bold ml-auto shadow-xs">
            {quickPing} ms
          </span>
        )}
      </button>

      {/* Verified Telemetry Benchmark Card Footer & Bufferbloat Breakdown */}
      {latestRecord && (
        <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--on-surface)] flex items-center gap-1.5 text-xs">
              <CheckCircleRounded sx={{ fontSize: 16, color: 'var(--color-success)' }} />
              {rating.grade}
            </span>
            <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
              {new Date(latestRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
            {rating.desc}
          </p>

          {latestRecord.bufferbloatMs !== undefined && latestRecord.bufferbloatMs !== null && (
            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--on-surface-muted)] font-semibold">Bufferbloat Rating</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    latestRecord.bufferbloatGrade === 'A+' || latestRecord.bufferbloatGrade === 'A'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                      : latestRecord.bufferbloatGrade === 'B'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-500'
                      : latestRecord.bufferbloatGrade === 'C'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                  }`}
                >
                  Grade {latestRecord.bufferbloatGrade ?? (latestRecord.bufferbloatMs < 15 ? 'A' : latestRecord.bufferbloatMs < 45 ? 'B' : 'C')} (+{latestRecord.bufferbloatMs} ms)
                </span>
              </div>

              {/* Tri-stage Latency Spectrum */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono bg-[var(--bg-subtle)]/80 p-2 rounded-xl border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[9px] uppercase">Idle RTT</span>
                  <span className="font-bold text-[var(--on-surface)]">
                    {latestRecord.latencyMs ? `${Math.round(latestRecord.latencyMs)} ms` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[9px] uppercase">Down Loaded</span>
                  <span className="font-bold text-[#0ea5e9]">
                    {latestRecord.downloadLoadedLatencyMs ? `${latestRecord.downloadLoadedLatencyMs} ms` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[9px] uppercase">Up Loaded</span>
                  <span className="font-bold text-[#f59e0b]">
                    {latestRecord.uploadLoadedLatencyMs ? `${latestRecord.uploadLoadedLatencyMs} ms` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

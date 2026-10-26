import { useState, useEffect } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import AltRouteRounded from '@mui/icons-material/AltRouteRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import { MOCK_TRACEROUTE_HOPS } from '../toolsData'

interface TracerouteWorkbenchModalProps {
  isOpen: boolean
  onClose: () => void
  initialTarget?: string
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function TracerouteWorkbenchModal({
  isOpen,
  onClose,
  initialTarget,
  onAddLog,
}: TracerouteWorkbenchModalProps) {
  const [targetHost, setTargetHost] = useState(initialTarget || '1.1.1.1')
  const [isTracing, setIsTracing] = useState(false)
  const [activeHopIndex, setActiveHopIndex] = useState(MOCK_TRACEROUTE_HOPS.length)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialTarget) {
      setTargetHost(initialTarget)
    }
  }, [initialTarget])

  if (!isOpen) return null

  const handleStartTrace = async () => {
    setIsTracing(true)
    setActiveHopIndex(0)
    onAddLog?.(`[Traceroute] Initiating multi-hop ICMP path trace to ${targetHost}...`, 'info')

    for (let i = 1; i <= MOCK_TRACEROUTE_HOPS.length; i++) {
      await new Promise((r) => setTimeout(r, 450))
      setActiveHopIndex(i)
      const currentHop = MOCK_TRACEROUTE_HOPS[i - 1]
      onAddLog?.(
        `[Hop ${currentHop.hop}] ${currentHop.ip} (${currentHop.host}) - RTT: ${currentHop.rtt}ms`,
        'info'
      )
    }

    setIsTracing(false)
    onAddLog?.(`[Traceroute] Target destination ${targetHost} reached in 6 hops (39.2ms)`, 'success')
  }

  const handleCopyMtr = () => {
    const text = `=== NEXIS VISUAL MULTI-HOP TRACEROUTE (MTR) ===
Target: ${targetHost}
Date: ${new Date().toISOString()}

Hop  IP Address       Hostname                      RTT      Loss  Autonomous System
${MOCK_TRACEROUTE_HOPS.slice(0, activeHopIndex)
  .map(
    (h) =>
      `${String(h.hop).padEnd(4)} ${h.ip.padEnd(16)} ${h.host.padEnd(28)} ${String(h.rtt + 'ms').padEnd(8)} 0.0%  ${h.as}`
  )
  .join('\n')}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const visibleHops = MOCK_TRACEROUTE_HOPS.slice(0, activeHopIndex)
  const finalHop = visibleHops[visibleHops.length - 1]

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            >
              <AltRouteRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">Visual Multi-Hop Traceroute</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  MTR / AS TOPOLOGY
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Inspect packet hops, isolate intermediate network delay & identify BGP routing nodes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] transition-all cursor-pointer"
          >
            <CloseRounded sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Target input bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase">Target:</span>
            <input
              type="text"
              value={targetHost}
              onChange={(e) => setTargetHost(e.target.value)}
              placeholder="e.g. 1.1.1.1, google.com, 8.8.8.8"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--on-surface)] focus:border-amber-400 outline-none flex-1 max-w-xs"
            />
            {['1.1.1.1', '8.8.8.8', 'gateway.local'].map((preset) => (
              <button
                key={preset}
                onClick={() => setTargetHost(preset)}
                className="px-2 py-1 rounded-lg text-[10px] font-mono border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] transition-all cursor-pointer hidden sm:block"
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartTrace}
            disabled={isTracing}
            className="px-4 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 bg-amber-500 text-black hover:bg-amber-400 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isTracing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Tracing Hops...</span>
              </>
            ) : (
              <>
                <PlayArrowRounded sx={{ fontSize: 16 }} />
                <span>Execute Trace</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Top Quick Telemetry Metric Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Total Hops</span>
              <span className="text-lg font-mono font-bold text-[var(--on-surface)]">
                {visibleHops.length} <span className="text-xs text-[var(--on-surface-muted)] font-sans">nodes</span>
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">End-to-End RTT</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {finalHop ? `${finalHop.rtt} ms` : '--'}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Local Gateway</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {visibleHops[0]?.rtt ? `${visibleHops[0].rtt} ms` : '1.2 ms'}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Path Loss</span>
              <span className="text-lg font-mono font-bold text-emerald-400">0.0% Clean</span>
            </div>
          </div>

          {/* Hop list / visual topology map */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
              INTERMEDIATE ROUTING HOPS & AUTONOMOUS SYSTEMS
            </span>

            <div className="flex flex-col gap-2">
              {visibleHops.map((hop, index) => {
                const isLast = index === visibleHops.length - 1
                return (
                  <div
                    key={hop.hop}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLast
                        ? 'border-amber-500/50 bg-amber-500/5 shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center font-mono font-bold text-xs text-amber-400 shrink-0">
                        #{hop.hop}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--on-surface)]">
                            {hop.ip}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--on-surface-muted)] truncate hidden md:inline">
                            ({hop.host})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-sans text-[var(--on-surface-muted)] mt-0.5">
                          <span className="font-semibold text-amber-400">{hop.as}</span>
                          <span>·</span>
                          <span className="truncate">{hop.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:self-center self-end">
                      {/* RTT latency bar */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-extrabold text-[var(--on-surface)]">
                            {hop.rtt} ms
                          </span>
                          <span className="text-[9px] font-mono text-[var(--on-surface-muted)]">RTT</span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${Math.min(100, (hop.rtt / 50) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]">
            <CheckCircleRounded sx={{ fontSize: 16, color: '#10B981' }} />
            <span>Path isolated with zero routing flaps or packet drops</span>
          </div>

          <button
            onClick={handleCopyMtr}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <CheckRounded sx={{ fontSize: 14, color: '#10B981' }} /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
            <span>{copied ? 'Copied' : 'Copy MTR Output'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

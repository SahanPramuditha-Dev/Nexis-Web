import { useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DnsRounded from '@mui/icons-material/DnsRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ShieldRounded from '@mui/icons-material/ShieldRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { MOCK_DNS_RESOLVERS } from '../toolsData'

interface DnsBenchmarkModalProps {
  isOpen: boolean
  onClose: () => void
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function DnsBenchmarkModal({ isOpen, onClose, onAddLog }: DnsBenchmarkModalProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [testedCount, setTestedCount] = useState(MOCK_DNS_RESOLVERS.length)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleBenchmark = async () => {
    setIsRunning(true)
    setTestedCount(0)
    onAddLog?.('[DNSBenchmark] Probing global Anycast and local recursive resolvers...', 'info')

    for (let i = 1; i <= MOCK_DNS_RESOLVERS.length; i++) {
      await new Promise((r) => setTimeout(r, 300))
      setTestedCount(i)
      const res = MOCK_DNS_RESOLVERS[i - 1]
      onAddLog?.(`[DNS] ${res.name} (${res.primaryIp}) - Response: ${res.latency}ms (DNSSEC: ${res.dnssec ? 'Yes' : 'No'})`, 'success')
    }

    setIsRunning(false)
    onAddLog?.('[DNSBenchmark] Benchmark complete: Cloudflare 1.1.1.1 is the fastest resolver (11ms)', 'info')
  }

  const resolvers = MOCK_DNS_RESOLVERS.slice(0, testedCount)
  const fastest = [...resolvers].sort((a, b) => a.latency - b.latency)[0]

  const handleCopy = () => {
    const text = `=== NEXIS DNS RESOLVER BENCHMARK ===
Timestamp: ${new Date().toISOString()}

Resolver            Primary IP       Latency   DNSSEC   Privacy Policy
${MOCK_DNS_RESOLVERS.map(
  (r) =>
    `${r.name.padEnd(20)} ${r.primaryIp.padEnd(16)} ${String(r.latency + 'ms').padEnd(9)} ${r.dnssec ? 'Yes' : 'No '}      ${r.privacy}`
).join('\n')}

Fastest Recommended: ${fastest?.name ?? 'Cloudflare'} (${fastest?.primaryIp ?? '1.1.1.1'})`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
            >
              <DnsRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">DNS Resolver & Leak Benchmark</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  DOH / RECURSIVE PROBE
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Compare query times across Cloudflare, Google, Quad9, OpenDNS & identify DNS cache poisoning risks
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
          {/* Winner Banner */}
          {fastest && (
            <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  #1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-sans text-[var(--on-surface)]">
                      {fastest.name} ({fastest.primaryIp})
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      FASTEST RESOLVER
                    </span>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] mt-0.5">
                    Query response recorded at {fastest.latency}ms with DNSSEC cryptographic signing enabled.
                  </p>
                </div>
              </div>

              <button
                onClick={handleBenchmark}
                disabled={isRunning}
                className="px-4 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Benchmarking...</span>
                  </>
                ) : (
                  <>
                    <PlayArrowRounded sx={{ fontSize: 16 }} />
                    <span>Re-Run Benchmark</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Benchmark comparison list */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
              RESOLVER RESPONSE LATENCY & SECURITY CAPABILITIES
            </span>

            <div className="flex flex-col gap-2.5">
              {resolvers.map((res) => {
                const isWinner = res.id === fastest?.id
                return (
                  <div
                    key={res.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isWinner
                        ? 'border-indigo-500/50 bg-indigo-500/5'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center shrink-0 font-mono font-extrabold text-xs text-indigo-400">
                        {res.primaryIp.split('.')[0]}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-sans text-[var(--on-surface)]">
                            {res.name}
                          </span>
                          <span className="text-xs font-mono text-indigo-400 font-bold">
                            {res.primaryIp}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)] mt-0.5">
                          <span>{res.privacy}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            {res.dnssec && <ShieldRounded sx={{ fontSize: 13 }} />}
                            {res.dnssec ? 'DNSSEC Verified' : 'No DNSSEC'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:self-center self-end">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-mono font-extrabold text-[var(--on-surface)]">
                          {res.latency} ms
                        </span>
                        <div className="w-28 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isWinner ? 'bg-indigo-400' : 'bg-[var(--on-surface-muted)]'
                            }`}
                            style={{ width: `${Math.min(100, (res.latency / 35) * 100)}%` }}
                          />
                        </div>
                      </div>
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
            <span>Zero DNS hijack or transparent proxy redirection detected</span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <CheckRounded sx={{ fontSize: 14, color: '#10B981' }} /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
            <span>{copied ? 'Copied' : 'Copy DNS Benchmark'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

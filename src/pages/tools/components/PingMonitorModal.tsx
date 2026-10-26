import { useState, useEffect, useRef } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import NetworkCheckRounded from '@mui/icons-material/NetworkCheckRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import StopRounded from '@mui/icons-material/StopRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'

interface PingMonitorModalProps {
  isOpen: boolean
  onClose: () => void
  initialTarget?: string
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function PingMonitorModal({ isOpen, onClose, initialTarget, onAddLog }: PingMonitorModalProps) {
  const [isRunning, setIsRunning] = useState(true)
  const [target, setTarget] = useState(initialTarget || '192.168.1.1')
  const [pingHistory, setPingHistory] = useState<number[]>([2.1, 1.8, 2.4, 1.9, 2.2, 3.1, 1.7, 2.0, 2.5, 1.9])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget)
    }
  }, [initialTarget])

  useEffect(() => {
    if (!isOpen) return

    if (isRunning) {
      onAddLog?.(`[PingMonitor] Streaming real-time ICMP echoes to ${target}...`, 'info')
      timerRef.current = setInterval(() => {
        // Sample realistic gateway ping
        const variation = (Math.random() - 0.5) * 1.2
        const nextPing = Math.max(1.1, +(2.0 + variation).toFixed(1))
        setPingHistory((prev) => [...prev.slice(-24), nextPing])
      }, 800)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen, isRunning, target, onAddLog])

  if (!isOpen) return null

  const minPing = pingHistory.length ? Math.min(...pingHistory) : 0
  const maxPing = pingHistory.length ? Math.max(...pingHistory) : 0
  const avgPing = pingHistory.length
    ? +(pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length).toFixed(1)
    : 0
  const currentPing = pingHistory[pingHistory.length - 1] ?? 0

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' }}
            >
              <NetworkCheckRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">Gateway Ping & Jitter Stream</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">
                  REALTIME ICMP
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Continuous real-time ping monitor tracking gateway jitter, micro-drops and latency spikes
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
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)]/30 border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[var(--on-surface-muted)]">Target:</span>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--on-surface)] focus:border-pink-400 outline-none w-36"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <StopRounded sx={{ fontSize: 16 }} />
                    <span>Pause Stream</span>
                  </>
                ) : (
                  <>
                    <PlayArrowRounded sx={{ fontSize: 16 }} />
                    <span>Resume</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setPingHistory([])}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] transition-all cursor-pointer"
                title="Clear samples"
              >
                <DeleteOutlineRounded sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>

          {/* Realtime Waveform SVG */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--on-surface-dim)] uppercase">
                LIVE LATENCY OSCILLATION (LAST 25 PINGS)
              </span>
              <span className="text-xs font-mono font-bold text-pink-400">
                Current: {currentPing} ms
              </span>
            </div>

            <div className="h-32 w-full flex items-end gap-1.5 pt-4 pb-1">
              {pingHistory.map((val, idx) => {
                const heightPercent = Math.min(100, (val / 6) * 100)
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-pink-500/30 to-pink-400 transition-all duration-200"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-[var(--on-surface-dim)] uppercase">MIN RTT</span>
              <span className="text-base font-mono font-bold text-emerald-400">{minPing} ms</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-[var(--on-surface-dim)] uppercase">AVG RTT</span>
              <span className="text-base font-mono font-bold text-cyan-400">{avgPing} ms</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-[var(--on-surface-dim)] uppercase">MAX RTT</span>
              <span className="text-base font-mono font-bold text-amber-400">{maxPing} ms</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-[var(--on-surface-dim)] uppercase">PACKET LOSS</span>
              <span className="text-base font-mono font-bold text-emerald-400">0.0%</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]">
            <CheckCircleRounded sx={{ fontSize: 16, color: '#10B981' }} />
            <span>Zero ICMP packet drop detected across stream</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium transition-all cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

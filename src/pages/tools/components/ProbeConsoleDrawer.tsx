import { useState } from 'react'
import TerminalRounded from '@mui/icons-material/TerminalRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowUpRounded from '@mui/icons-material/KeyboardArrowUpRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import type { ProbeLogEntry } from '../toolsData'

interface ProbeConsoleDrawerProps {
  isOpen: boolean
  onToggle: () => void
  logs: ProbeLogEntry[]
  onClearLogs: () => void
}

export function ProbeConsoleDrawer({
  isOpen,
  onToggle,
  logs,
  onClearLogs,
}: ProbeConsoleDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warning' | 'success'>('all')

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true
    return log.level === filterLevel
  })

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out border-t bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl ${
        isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-46px)]'
      }`}
    >
      {/* Drawer Handle Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[var(--bg-subtle)]/60 cursor-pointer select-none hover:bg-[var(--bg-subtle)] transition-colors border-b border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-2.5">
          <TerminalRounded sx={{ fontSize: 18 }} className="text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--on-surface)]">
            LIVE PROBE EVENT STREAM
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--on-surface-muted)] border border-[var(--border-subtle)]">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isOpen && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-[10px] font-mono">
                {(['all', 'success', 'warning', 'error'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFilterLevel(lvl)}
                    className={`px-1.5 py-0.5 rounded uppercase font-bold transition-all cursor-pointer ${
                      filterLevel === lvl
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopyLogs}
                className="p-1 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] transition-all cursor-pointer"
                title="Copy Terminal Logs"
              >
                {copied ? <CheckRounded sx={{ fontSize: 16, color: '#10B981' }} /> : <ContentCopyRounded sx={{ fontSize: 16 }} />}
              </button>
              <button
                onClick={onClearLogs}
                className="p-1 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--on-surface-muted)] hover:text-rose-400 transition-all cursor-pointer"
                title="Clear Terminal"
              >
                <DeleteOutlineRounded sx={{ fontSize: 16 }} />
              </button>
            </div>
          )}

          <div className="text-[var(--on-surface-muted)]">
            {isOpen ? <KeyboardArrowDownRounded sx={{ fontSize: 20 }} /> : <KeyboardArrowUpRounded sx={{ fontSize: 20 }} />}
          </div>
        </div>
      </div>

      {/* Terminal Output */}
      {isOpen && (
        <div className="h-56 overflow-y-auto p-4 font-mono text-xs flex flex-col gap-1.5 bg-black/40">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--on-surface-dim)] italic">
              Probe terminal idling. Run any diagnostic probe to stream socket telemetry.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const colorClass =
                log.level === 'error'
                  ? 'text-rose-400'
                  : log.level === 'warning'
                  ? 'text-amber-400'
                  : log.level === 'success'
                  ? 'text-emerald-400'
                  : 'text-cyan-300'
              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[var(--on-surface-dim)] shrink-0 select-none">
                    [{log.timestamp}]
                  </span>
                  <span className={`font-semibold shrink-0 uppercase text-[10px] px-1 py-0.5 rounded bg-[var(--bg-subtle)] ${colorClass}`}>
                    {log.level}
                  </span>
                  <span className="text-[var(--on-surface)] break-all">{log.message}</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

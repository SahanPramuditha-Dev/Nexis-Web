import { useState, useEffect } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import SecurityRounded from '@mui/icons-material/SecurityRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import ShieldRounded from '@mui/icons-material/ShieldRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { MOCK_PORT_SCAN_RESULTS } from '../toolsData'

interface PortScannerModalProps {
  isOpen: boolean
  onClose: () => void
  initialTarget?: string
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function PortScannerModal({ isOpen, onClose, initialTarget, onAddLog }: PortScannerModalProps) {
  const [targetIp, setTargetIp] = useState(initialTarget || '192.168.1.1')
  const [isScanning, setIsScanning] = useState(false)
  const [scannedPortsCount, setScannedPortsCount] = useState(MOCK_PORT_SCAN_RESULTS.length)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialTarget) {
      setTargetIp(initialTarget)
    }
  }, [initialTarget])

  if (!isOpen) return null

  const handleStartScan = async () => {
    setIsScanning(true)
    setScannedPortsCount(0)
    onAddLog?.(`[PortScanner] Probing common service ports on ${targetIp}...`, 'info')

    for (let i = 1; i <= MOCK_PORT_SCAN_RESULTS.length; i++) {
      await new Promise((r) => setTimeout(r, 220))
      setScannedPortsCount(i)
      const p = MOCK_PORT_SCAN_RESULTS[i - 1]
      onAddLog?.(
        `[Port ${p.port}/${p.proto}] Service ${p.service}: ${p.state} (Risk: ${p.risk})`,
        p.state === 'Open' ? (p.risk === 'High' ? 'warning' : 'success') : 'info'
      )
    }

    setIsScanning(false)
    onAddLog?.(`[PortScanner] Audit complete on ${targetIp}: 4 open services found`, 'success')
  }

  const handleCopy = () => {
    const text = `=== NEXIS PORT & VULNERABILITY AUDIT ===
Target IP: ${targetIp}
Timestamp: ${new Date().toISOString()}

Port    Proto  Service     State     Risk    Details
${MOCK_PORT_SCAN_RESULTS.slice(0, scannedPortsCount)
  .map(
    (p) =>
      `${String(p.port).padEnd(7)} ${p.proto.padEnd(6)} ${p.service.padEnd(11)} ${p.state.padEnd(9)} ${p.risk.padEnd(7)} ${p.info}`
  )
  .join('\n')}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const results = MOCK_PORT_SCAN_RESULTS.slice(0, scannedPortsCount)
  const openCount = results.filter((p) => p.state === 'Open').length
  const highRiskCount = results.filter((p) => p.risk === 'High' && p.state === 'Open').length

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
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              <SecurityRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">Port & Vulnerability Scanner</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                  SECURITY AUDIT
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Probe open network ports, audit service banners, and assess firewall perimeter posture
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
            <span className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase">Target IP:</span>
            <input
              type="text"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              placeholder="e.g. 192.168.1.1 or 127.0.0.1"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--on-surface)] focus:border-rose-400 outline-none flex-1 max-w-xs"
            />
            {['192.168.1.1', '192.168.1.14', '127.0.0.1'].map((preset) => (
              <button
                key={preset}
                onClick={() => setTargetIp(preset)}
                className="px-2 py-1 rounded-lg text-[10px] font-mono border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] transition-all cursor-pointer hidden sm:block"
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 bg-rose-500 text-white hover:bg-rose-600 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Auditing Ports...</span>
              </>
            ) : (
              <>
                <PlayArrowRounded sx={{ fontSize: 16 }} />
                <span>Start Port Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Quick Security HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Ports Probed</span>
              <span className="text-lg font-mono font-bold text-[var(--on-surface)]">
                {results.length} / {MOCK_PORT_SCAN_RESULTS.length}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Open Services</span>
              <span className="text-lg font-mono font-bold text-amber-400">{openCount} active</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">High Exposure</span>
              <span className="text-lg font-mono font-bold text-rose-400">{highRiskCount} alert</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Firewall Status</span>
              <span className="text-lg font-mono font-bold text-emerald-400">Filtering Active</span>
            </div>
          </div>

          {/* Port Results Table */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
              PROBED PROTOCOLS & RUNNING SERVICES
            </span>

            <div className="flex flex-col gap-2">
              {results.map((port) => (
                <div
                  key={port.port}
                  className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-10 rounded-lg bg-[var(--bg-subtle)] flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-mono font-extrabold text-[var(--on-surface)]">
                        {port.port}
                      </span>
                      <span className="text-[8px] font-mono text-[var(--on-surface-dim)]">
                        {port.proto}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-sans text-[var(--on-surface)]">
                          {port.service}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            port.state === 'Open'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : port.state === 'Filtered'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)]'
                          }`}
                        >
                          {port.state.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-[var(--on-surface-muted)] truncate mt-0.5">
                        {port.info}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center self-end">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        port.risk === 'High'
                          ? 'bg-rose-500/15 text-rose-400'
                          : port.risk === 'Medium'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {port.risk} Risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]">
            <ShieldRounded sx={{ fontSize: 16, color: '#10B981' }} />
            <span>LAN perimeter filtering verified active</span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <CheckRounded sx={{ fontSize: 14, color: '#10B981' }} /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
            <span>{copied ? 'Copied' : 'Copy Port Log'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

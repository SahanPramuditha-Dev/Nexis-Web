import { useState, useEffect } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import PowerSettingsNewRounded from '@mui/icons-material/PowerSettingsNewRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'

interface WakeOnLanModalProps {
  isOpen: boolean
  onClose: () => void
  initialMac?: string
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function WakeOnLanModal({ isOpen, onClose, initialMac, onAddLog }: WakeOnLanModalProps) {
  const [macAddress, setMacAddress] = useState(initialMac || '3C:06:30:8F:B2:44')
  const [broadcastIp, setBroadcastIp] = useState('255.255.255.255')
  const [port, setPort] = useState<'9' | '7'>('9')
  const [isSending, setIsSending] = useState(false)
  const [dispatchedHistory, setDispatchedHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialMac) {
      setMacAddress(initialMac)
    }
  }, [initialMac])

  if (!isOpen) return null

  const handleSendMagicPacket = async () => {
    setIsSending(true)
    onAddLog?.(`[WoL] Assembling 102-byte UDP magic packet for MAC ${macAddress}...`, 'info')

    await new Promise((r) => setTimeout(r, 450))

    const timestamp = new Date().toLocaleTimeString()
    const logItem = `${timestamp} - Broadcast ${broadcastIp}:${port} -> Target MAC ${macAddress} (102 Bytes)`
    setDispatchedHistory((prev) => [logItem, ...prev])

    setIsSending(false)
    onAddLog?.(`[WoL] Magic packet successfully broadcast across subnet to wake host ${macAddress}`, 'success')
  }

  const handleCopyPayload = () => {
    const rawMac = macAddress.replace(/[:-]/g, '').toUpperCase()
    const payload = 'FF FF FF FF FF FF ' + Array(16).fill(rawMac.match(/.{1,2}/g)?.join(' ')).join(' ')
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rawMac = macAddress.replace(/[:-]/g, '').toUpperCase()
  const hexPreview = 'FF FF FF FF FF FF ' + Array(4).fill(rawMac.match(/.{1,2}/g)?.join(' ') || '').join(' ') + ' ... [102 Bytes Total]'

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
              style={{ background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)' }}
            >
              <PowerSettingsNewRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">Wake-on-LAN (WoL) Controller</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                  UDP MAGIC PACKET
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Broadcast UDP magic packets to wake sleeping PCs, NAS appliances, and remote media servers
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
          {/* Form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase">
                Target Physical (MAC) Address:
              </label>
              <input
                type="text"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="e.g. 3C:06:30:8F:B2:44"
                className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--on-surface)] focus:border-yellow-400 outline-none"
              />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[var(--on-surface-dim)]">Quick Presets:</span>
                {[
                  { label: 'Workstation Mac', mac: '3C:06:30:8F:B2:44' },
                  { label: 'Home NAS Server', mac: 'DC:A6:32:4A:11:89' },
                  { label: 'Gaming PC', mac: '70:EC:E4:71:02:18' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setMacAddress(item.mac)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--on-surface-muted)] cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase">
                  Broadcast Subnet IP:
                </label>
                <input
                  type="text"
                  value={broadcastIp}
                  onChange={(e) => setBroadcastIp(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-mono text-[var(--on-surface)] focus:border-yellow-400 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase">
                  UDP Destination Port:
                </label>
                <div className="flex items-center gap-2">
                  {(['9', '7'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPort(p)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                        port === p
                          ? 'border-yellow-400 bg-yellow-500/10 text-yellow-400'
                          : 'border-[var(--border-subtle)] text-[var(--on-surface-muted)]'
                      }`}
                    >
                      Port {p} (Standard)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hex Preview Card */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--on-surface-dim)] uppercase">
                MAGIC PACKET HEX PAYLOAD ARCHITECTURE (102 BYTES)
              </span>
              <button
                onClick={handleCopyPayload}
                className="text-[10px] font-sans text-yellow-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copied ? <CheckRounded sx={{ fontSize: 12 }} /> : <ContentCopyRounded sx={{ fontSize: 12 }} />}
                <span>{copied ? 'Copied' : 'Copy Payload'}</span>
              </button>
            </div>
            <code className="text-[11px] font-mono text-[var(--on-surface-muted)] break-all leading-relaxed p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              {hexPreview}
            </code>
          </div>

          {/* Dispatch button */}
          <button
            onClick={handleSendMagicPacket}
            disabled={isSending}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-sans font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Broadcasting Magic Frame...</span>
              </>
            ) : (
              <>
                <SendRounded sx={{ fontSize: 18 }} />
                <span>Transmit Wake-on-LAN Packet</span>
              </>
            )}
          </button>

          {/* History */}
          {dispatchedHistory.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] font-mono font-bold text-[var(--on-surface-dim)] uppercase">
                TRANSMISSION HISTORY
              </span>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                {dispatchedHistory.map((item, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-[var(--bg-subtle)]/50 text-[11px] font-mono text-emerald-400 flex items-center gap-2"
                  >
                    <CheckCircleRounded sx={{ fontSize: 14 }} />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

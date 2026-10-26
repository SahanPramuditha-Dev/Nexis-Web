import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DevicesRounded from '@mui/icons-material/DevicesRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import LaptopRounded from '@mui/icons-material/LaptopRounded'
import RouterRounded from '@mui/icons-material/RouterRounded'
import TvRounded from '@mui/icons-material/TvRounded'
import SportsEsportsRounded from '@mui/icons-material/SportsEsportsRounded'
import DnsRounded from '@mui/icons-material/DnsRounded'
import LightbulbRounded from '@mui/icons-material/LightbulbRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import SecurityRounded from '@mui/icons-material/SecurityRounded'
import PowerSettingsNewRounded from '@mui/icons-material/PowerSettingsNewRounded'
import NetworkCheckRounded from '@mui/icons-material/NetworkCheckRounded'
import HubRounded from '@mui/icons-material/HubRounded'
import { MOCK_LAN_DEVICES } from '../toolsData'

interface LanScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
  onCrossToolAction?: (action: 'port-scan' | 'wol' | 'ping', target: { ip: string; mac: string }) => void
}

export function LanScannerModal({ isOpen, onClose, onAddLog, onCrossToolAction }: LanScannerModalProps) {
  const navigate = useNavigate()
  const [subnet, setSubnet] = useState('192.168.1.0/24')
  const [isScanning, setIsScanning] = useState(false)
  const [discoveredCount, setDiscoveredCount] = useState(MOCK_LAN_DEVICES.length)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleStartScan = async () => {
    setIsScanning(true)
    setDiscoveredCount(0)
    onAddLog?.(`[LANScanner] Sweeping subnet ${subnet} using ARP & mDNS probes...`, 'info')

    for (let i = 1; i <= MOCK_LAN_DEVICES.length; i++) {
      await new Promise((r) => setTimeout(r, 260))
      setDiscoveredCount(i)
      const d = MOCK_LAN_DEVICES[i - 1]
      onAddLog?.(
        `[Discovered Host] ${d.ip} · ${d.name} (${d.vendor}) - ${d.latency}`,
        d.isIntruder ? 'warning' : 'success'
      )
    }

    setIsScanning(false)
    onAddLog?.(`[LANScanner] Sweep complete: ${MOCK_LAN_DEVICES.length} hosts discovered (1 suspicious)`, 'info')
  }

  const handleCopy = () => {
    const text = `=== NEXIS LAN SUBNET AUDIT REPORT ===
Subnet: ${subnet}
Timestamp: ${new Date().toISOString()}

IP Address       MAC Address        Vendor                  Device Name
${MOCK_LAN_DEVICES.slice(0, discoveredCount)
  .map(
    (d) =>
      `${d.ip.padEnd(16)} ${d.mac.padEnd(18)} ${d.vendor.padEnd(23)} ${d.name} (${d.type})`
  )
  .join('\n')}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const devices = MOCK_LAN_DEVICES.slice(0, discoveredCount)
  const intruderCount = devices.filter((d) => d.isIntruder).length

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Gateway':
        return <RouterRounded sx={{ fontSize: 18 }} />
      case 'Workstation':
        return <LaptopRounded sx={{ fontSize: 18 }} />
      case 'Server':
        return <DnsRounded sx={{ fontSize: 18 }} />
      case 'Gaming Console':
        return <SportsEsportsRounded sx={{ fontSize: 18 }} />
      case 'Smart TV':
        return <TvRounded sx={{ fontSize: 18 }} />
      case 'IoT Device':
        return <LightbulbRounded sx={{ fontSize: 18 }} />
      default:
        return <WarningRounded sx={{ fontSize: 18, color: '#EF4444' }} />
    }
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
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              <DevicesRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">LAN Device & Intruder Discovery</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  ARP / MDNS SWEEP
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                Scan local subnet to discover connected phones, laptops, smart TVs, and spot unauthorized guests
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

        {/* Subnet input bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-xs font-mono font-bold text-[var(--on-surface-muted)] uppercase">Subnet:</span>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--on-surface)] focus:border-emerald-400 outline-none flex-1 max-w-xs"
            />
            {['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24'].map((preset) => (
              <button
                key={preset}
                onClick={() => setSubnet(preset)}
                className="px-2 py-1 rounded-lg text-[10px] font-mono border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] transition-all cursor-pointer hidden sm:block"
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Scanning Subnet...</span>
              </>
            ) : (
              <>
                <PlayArrowRounded sx={{ fontSize: 16 }} />
                <span>Sweep Subnet</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Quick HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Discovered Devices</span>
              <span className="text-lg font-mono font-bold text-[var(--on-surface)]">
                {devices.length} hosts
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Intruder Alerts</span>
              <span
                className={`text-lg font-mono font-bold ${
                  intruderCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {intruderCount > 0 ? `${intruderCount} Detected` : 'Zero Threat'}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Gateway Node</span>
              <span className="text-lg font-mono font-bold text-emerald-400">192.168.1.1</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">ARP Cache</span>
              <span className="text-lg font-mono font-bold text-cyan-400">Synchronized</span>
            </div>
          </div>

          {/* Device list */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
              DISCOVERED SUBNET HOSTS & HARDWARE VENDORS
            </span>

            <div className="flex flex-col gap-2">
              {devices.map((device) => (
                <div
                  key={device.ip}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    device.isIntruder
                      ? 'border-rose-500/50 bg-rose-500/5 shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        device.isIntruder
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-[var(--bg-subtle)] text-[var(--on-surface)]'
                      }`}
                    >
                      {getDeviceIcon(device.type)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-sans text-[var(--on-surface)]">
                          {device.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--on-surface-muted)]">
                          {device.ip}
                        </span>
                        {device.isIntruder && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                            UNRECOGNIZED OUI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-sans text-[var(--on-surface-muted)] mt-0.5">
                        <span className="font-mono text-[10px]">{device.mac}</span>
                        <span>·</span>
                        <span>{device.vendor}</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-mono text-[10px]">{device.latency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 sm:self-center self-end flex-wrap">
                    {/* Action buttons: Probe Ports, WoL, Ping */}
                    <button
                      onClick={() => onCrossToolAction?.('port-scan', { ip: device.ip, mac: device.mac })}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-[var(--bg-subtle)] hover:bg-rose-500/20 text-[var(--on-surface)] hover:text-rose-400 border border-[var(--border-subtle)] flex items-center gap-1 transition-all cursor-pointer"
                      title={`Probe open ports on ${device.ip}`}
                    >
                      <SecurityRounded sx={{ fontSize: 13 }} />
                      <span>Ports</span>
                    </button>

                    <button
                      onClick={() => onCrossToolAction?.('ping', { ip: device.ip, mac: device.mac })}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-[var(--bg-subtle)] hover:bg-pink-500/20 text-[var(--on-surface)] hover:text-pink-400 border border-[var(--border-subtle)] flex items-center gap-1 transition-all cursor-pointer"
                      title={`Stream live ping to ${device.ip}`}
                    >
                      <NetworkCheckRounded sx={{ fontSize: 13 }} />
                      <span>Ping</span>
                    </button>

                    <button
                      onClick={() => onCrossToolAction?.('wol', { ip: device.ip, mac: device.mac })}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-[var(--bg-subtle)] hover:bg-yellow-500/20 text-[var(--on-surface)] hover:text-yellow-400 border border-[var(--border-subtle)] flex items-center gap-1 transition-all cursor-pointer"
                      title={`Transmit Wake-on-LAN packet to ${device.mac}`}
                    >
                      <PowerSettingsNewRounded sx={{ fontSize: 13 }} />
                      <span>WoL</span>
                    </button>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--on-surface-dim)] hidden md:inline">
                      {device.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]">
            {intruderCount > 0 ? (
              <>
                <WarningAmberRounded sx={{ fontSize: 16, color: '#EF4444' }} />
                <span className="text-rose-400 font-medium">1 unrecognized MAC detected without active DHCP lease</span>
              </>
            ) : (
              <span>All 7 connected endpoints match authenticated network profiles</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose()
                navigate('/topology')
              }}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer text-cyan-400"
              title="Navigate to Subnet Topology Matrix"
            >
              <HubRounded sx={{ fontSize: 14 }} />
              <span>Subnet Topology</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <CheckRounded sx={{ fontSize: 14, color: '#10B981' }} /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
              <span>{copied ? 'Copied' : 'Copy Subnet List'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

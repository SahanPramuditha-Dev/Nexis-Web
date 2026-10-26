import { useState } from 'react'
import HubRounded from '@mui/icons-material/HubRounded'
import RouterRounded from '@mui/icons-material/RouterRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import LaptopMacRounded from '@mui/icons-material/LaptopMacRounded'
import SmartphoneRounded from '@mui/icons-material/SmartphoneRounded'
import TvRounded from '@mui/icons-material/TvRounded'
import VideocamRounded from '@mui/icons-material/VideocamRounded'
import StorageRounded from '@mui/icons-material/StorageRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import DeviceHubRounded from '@mui/icons-material/DeviceHubRounded'

interface DeviceNode {
  id: string
  name: string
  ip: string
  mac: string
  vendor: string
  type: 'laptop' | 'phone' | 'tv' | 'camera' | 'nas' | 'iot'
  band: '5 GHz' | '2.4 GHz' | 'Gigabit LAN'
  rssi?: number // dBm
  linkRate: string
  status: 'active' | 'idle' | 'warning'
  downloadRate: string
  uploadRate: string
}

const MOCK_DEVICES: DeviceNode[] = [
  {
    id: 'dev-1',
    name: 'MacBook Pro M3 Max',
    ip: '192.168.1.102',
    mac: 'F0:18:98:C3:4B:11',
    vendor: 'Apple Inc.',
    type: 'laptop',
    band: '5 GHz',
    rssi: -48,
    linkRate: '1200 Mbps (Wi-Fi 6)',
    status: 'active',
    downloadRate: '84.2 MB/s',
    uploadRate: '12.5 MB/s',
  },
  {
    id: 'dev-2',
    name: 'iPhone 16 Pro',
    ip: '192.168.1.108',
    mac: 'AC:75:1D:9A:20:84',
    vendor: 'Apple Inc.',
    type: 'phone',
    band: '5 GHz',
    rssi: -56,
    linkRate: '960 Mbps',
    status: 'active',
    downloadRate: '14.1 MB/s',
    uploadRate: '2.4 MB/s',
  },
  {
    id: 'dev-3',
    name: 'Synology DiskStation DS923+',
    ip: '192.168.1.20',
    mac: '00:11:32:8E:A4:FC',
    vendor: 'Synology Corp',
    type: 'nas',
    band: 'Gigabit LAN',
    linkRate: '2.5 Gbps Ethernet',
    status: 'active',
    downloadRate: '128.0 MB/s',
    uploadRate: '92.4 MB/s',
  },
  {
    id: 'dev-4',
    name: 'Sony Bravia 4K OLED',
    ip: '192.168.1.144',
    mac: '70:26:05:81:49:10',
    vendor: 'Sony Corp',
    type: 'tv',
    band: '5 GHz',
    rssi: -62,
    linkRate: '433 Mbps',
    status: 'active',
    downloadRate: '28.6 MB/s',
    uploadRate: '0.8 MB/s',
  },
  {
    id: 'dev-5',
    name: 'Ubiquiti G5 Pro Perimeter Cam',
    ip: '192.168.1.75',
    mac: '74:83:C2:5F:1A:30',
    vendor: 'Ubiquiti Networks',
    type: 'camera',
    band: 'Gigabit LAN',
    linkRate: '1000 Mbps PoE',
    status: 'active',
    downloadRate: '0.2 MB/s',
    uploadRate: '8.4 MB/s',
  },
  {
    id: 'dev-6',
    name: 'Pixel 9 Pro Fold',
    ip: '192.168.1.115',
    mac: '3C:28:6D:77:E1:92',
    vendor: 'Google LLC',
    type: 'phone',
    band: '2.4 GHz',
    rssi: -72,
    linkRate: '144 Mbps',
    status: 'warning',
    downloadRate: '1.2 MB/s',
    uploadRate: '0.3 MB/s',
  },
]

export function TopologyPage() {
  const [search, setSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<DeviceNode | null>(MOCK_DEVICES[0])
  const [filterType, setFilterType] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const filteredDevices = MOCK_DEVICES.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip.includes(search) ||
      d.vendor.toLowerCase().includes(search.toLowerCase())
    if (filterType === 'all') return matchSearch
    if (filterType === '5ghz') return matchSearch && d.band.includes('5 GHz')
    if (filterType === 'lan') return matchSearch && d.band.includes('LAN')
    if (filterType === 'warning') return matchSearch && d.status === 'warning'
    return matchSearch
  })

  const getDeviceIcon = (type: DeviceNode['type']) => {
    switch (type) {
      case 'laptop':
        return <LaptopMacRounded sx={{ fontSize: 20 }} />
      case 'phone':
        return <SmartphoneRounded sx={{ fontSize: 20 }} />
      case 'tv':
        return <TvRounded sx={{ fontSize: 20 }} />
      case 'camera':
        return <VideocamRounded sx={{ fontSize: 20 }} />
      case 'nas':
        return <StorageRounded sx={{ fontSize: 20 }} />
      default:
        return <DeviceHubRounded sx={{ fontSize: 20 }} />
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1280px] mx-auto p-4 sm:p-6 md:p-8 select-none">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            <span>NETWORK INTELLIGENCE</span>
            <span>/</span>
            <span>TOPOLOGY & NODES</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans mt-1"
            style={{ color: 'var(--on-surface)' }}
          >
            Subnet Topology Matrix
          </h1>
          <p className="text-xs sm:text-sm font-sans mt-0.5 text-[var(--on-surface-muted)]">
            Real-time visualization of local infrastructure, gateway mesh nodes, and active client links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:bg-[var(--bg-subtle)] active:scale-95"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--on-surface)' }}
          >
            <RefreshRounded sx={{ fontSize: 16 }} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Rescan Subnet</span>
          </button>
        </div>
      </div>

      {/* ── Network Backbone Visual Tree ──────────────────────────────────── */}
      <div
        className="nexis-card p-5 sm:p-6 border flex flex-col gap-5 rounded-2xl relative overflow-hidden"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest uppercase font-mono text-[var(--primary)]">
            CORE INFRASTRUCTURE HIERARCHY
          </span>
          <span className="text-xs font-mono text-[var(--color-success)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
            Subnet Gateway 192.168.1.1 · Healthy
          </span>
        </div>

        {/* Node Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Node 1: WAN Edge */}
          <div
            className="p-4 rounded-xl border flex items-center gap-3.5 transition-all"
            style={{
              borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--bg-subtle) 80%, transparent)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/15 text-[var(--primary)]">
              <HubRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="text-xs font-bold font-sans text-[var(--on-surface)]">
                Optical WAN ONT (Fiber)
              </div>
              <div className="text-[11px] font-mono text-[var(--on-surface-muted)]">
                WAN IP: 103.21.244.12 · 10G SFP+
              </div>
            </div>
          </div>

          {/* Node 2: Core Router */}
          <div
            className="p-4 rounded-xl border flex items-center gap-3.5 transition-all"
            style={{
              borderColor: 'color-mix(in srgb, var(--primary) 40%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--bg-subtle) 80%, transparent)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-400">
              <RouterRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="text-xs font-bold font-sans text-[var(--on-surface)]">
                NEXIS Edge Gateway Pro
              </div>
              <div className="text-[11px] font-mono text-[var(--on-surface-muted)]">
                192.168.1.1 · MTU 1500 · DHCP Active
              </div>
            </div>
          </div>

          {/* Node 3: Wireless AP */}
          <div
            className="p-4 rounded-xl border flex items-center gap-3.5 transition-all"
            style={{
              borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--bg-subtle) 80%, transparent)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/15 text-purple-400">
              <WifiRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="text-xs font-bold font-sans text-[var(--on-surface)]">
                Wi-Fi 7 Tri-Band AP
              </div>
              <div className="text-[11px] font-mono text-[var(--on-surface-muted)]">
                Ch 36 (5 GHz) + Ch 6 (2.4 GHz) · 6 Clients
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Client Devices Explorer & Detail Pane ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Device List (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <SearchRounded sx={{ fontSize: 18 }} className="text-[var(--on-surface-dim)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search device name, IP, or vendor..."
                className="bg-transparent outline-none w-full text-xs font-sans text-[var(--on-surface)]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All (6)' },
                { id: '5ghz', label: '5 GHz' },
                { id: 'lan', label: 'Ethernet' },
                { id: 'warning', label: 'Weak Signal' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    filterType === f.id
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Cards */}
          <div className="flex flex-col gap-2.5">
            {filteredDevices.map((device) => {
              const isSelected = selectedDevice?.id === device.id
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--bg-surface))] shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        device.status === 'warning'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-[var(--bg-subtle)] text-[var(--primary)]'
                      }`}
                    >
                      {getDeviceIcon(device.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-sans truncate text-[var(--on-surface)]">
                          {device.name}
                        </span>
                        {device.status === 'warning' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400">
                            Low RSSI
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[var(--on-surface-muted)] flex items-center gap-2 mt-0.5">
                        <span>{device.ip}</span>
                        <span>·</span>
                        <span>{device.vendor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span className="text-xs font-mono font-bold text-[var(--on-surface)]">
                      {device.downloadRate}
                    </span>
                    <span className="text-[11px] font-sans text-[var(--on-surface-dim)]">
                      {device.band}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Selected Device Detail Panel (1 col) */}
        <div className="flex flex-col gap-4">
          {selectedDevice ? (
            <div
              className="nexis-card p-5 border rounded-2xl flex flex-col gap-4 sticky top-4"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-[var(--primary)]">
                  DEVICE TELEMETRY
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                  Online
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold font-sans text-[var(--on-surface)]">
                  {selectedDevice.name}
                </h3>
                <span className="text-xs font-mono text-[var(--on-surface-muted)]">
                  MAC: {selectedDevice.mac}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-[var(--on-surface-dim)]">IPv4 Address</span>
                  <span className="text-xs font-mono font-bold text-[var(--on-surface)] mt-1">{selectedDevice.ip}</span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-[var(--on-surface-dim)]">Interface</span>
                  <span className="text-xs font-sans font-bold text-[var(--on-surface)] mt-1">{selectedDevice.band}</span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-[var(--on-surface-dim)]">PHY Link Rate</span>
                  <span className="text-xs font-mono font-bold text-[var(--on-surface)] mt-1">{selectedDevice.linkRate}</span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-[var(--on-surface-dim)]">Radio Signal (RSSI)</span>
                  <span className="text-xs font-mono font-bold text-[var(--on-surface)] mt-1">
                    {selectedDevice.rssi ? `${selectedDevice.rssi} dBm` : 'Wired (0 dBm)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border flex flex-col gap-2 mt-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--on-surface-dim)]">
                  Live Bandwidth Throughput
                </span>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--on-surface-muted)]">Downlink:</span>
                  <span className="font-bold text-[var(--primary)]">{selectedDevice.downloadRate}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--on-surface-muted)]">Uplink:</span>
                  <span className="font-bold text-cyan-400">{selectedDevice.uploadRate}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 shadow-sm"
                  onClick={() => alert(`Ping sent to ${selectedDevice.ip}: RTT 1.2ms (0% drop)`)}
                >
                  Ping Device
                </button>
                <button
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:bg-[var(--bg-subtle)] text-[var(--on-surface)]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  onClick={() => alert(`Opening port audit for ${selectedDevice.ip}...`)}
                >
                  Scan Ports
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-2xl text-xs text-[var(--on-surface-dim)]">
              Select a device node from the list to view live telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

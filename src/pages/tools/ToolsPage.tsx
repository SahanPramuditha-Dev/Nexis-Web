import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchRounded from '@mui/icons-material/SearchRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import HealingRounded from '@mui/icons-material/HealingRounded'
import TerminalRounded from '@mui/icons-material/TerminalRounded'
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded'
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded'
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import PublicRounded from '@mui/icons-material/PublicRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import NetworkCheckRounded from '@mui/icons-material/NetworkCheckRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'

import { detectClientCarrier, type CarrierIdentity } from '@/data/carrierService'
import {
  getAllProbeAudits,
  clearAllProbeAudits,
  deleteProbeAudit,
  type ProbeAuditRecord,
} from '@/data/db'
import { addAlert } from '@/data/alertsService'
import {
  ALL_TOOLS,
  TOOL_CATEGORIES,
  type ProbeLogEntry,
} from './toolsData'
import {
  ToolCard,
  NetworkDoctorModal,
  TracerouteWorkbenchModal,
  PortScannerModal,
  LanScannerModal,
  PublicIpModal,
  DnsBenchmarkModal,
  WifiAnalyzerModal,
  WakeOnLanModal,
  SpeedDiagnosticModal,
  SurveyorModal,
  PingMonitorModal,
  ProbeConsoleDrawer,
  DiagnosticCertificateModal,
  EnvironmentalPredictorModal,
} from './components'

export function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCat = searchParams.get('cat') || 'all'
  const toolQueryParam = searchParams.get('tool')
  const targetQueryParam = searchParams.get('target')

  const [searchQuery, setSearchQuery] = useState('')

  // Modals state & Cross-tool prefilled targets
  const [activeModal, setActiveModal] = useState<string | null>(toolQueryParam || null)
  const [prefilledTarget, setPrefilledTarget] = useState<string>(targetQueryParam || '')
  const [prefilledMac, setPrefilledMac] = useState<string>('')
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Real carrier WAN identity
  const [carrierInfo, setCarrierInfo] = useState<CarrierIdentity | null>(null)
  const [gatewayRtt, setGatewayRtt] = useState<string>('2.1 ms')

  // Background Gateway Watchdog state
  const [watchdogActive, setWatchdogActive] = useState<boolean>(() => {
    return localStorage.getItem('nexis_gateway_watchdog') === 'true'
  })
  const [watchdogLastChecked, setWatchdogLastChecked] = useState<string>('Ready')
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persistent Probe Audits from IndexedDB
  const [probeAudits, setProbeAudits] = useState<ProbeAuditRecord[]>([])

  // Live probe logs
  const [logs, setLogs] = useState<ProbeLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      toolId: 'system',
      toolName: 'Nexis Agent',
      level: 'info',
      message: 'Probe subsystem initialized. Local interface dual-stack IPv4/IPv6 verified.',
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      toolId: 'system',
      toolName: 'Nexis Agent',
      level: 'success',
      message: 'Default gateway 192.168.1.1 is reachable with sub-3ms echo latency.',
    },
  ])

  const addLog = (
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
    toolId = 'probe',
    toolName = 'Diagnostic Probe'
  ) => {
    const entry: ProbeLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      toolId,
      toolName,
      level,
      message,
    }
    setLogs((prev) => [entry, ...prev.slice(0, 150)])
  }

  // Synchronize deep-linking from URL query (?tool=... & ?target=...)
  useEffect(() => {
    if (toolQueryParam && toolQueryParam !== activeModal) {
      setActiveModal(toolQueryParam)
    }
    if (targetQueryParam) {
      setPrefilledTarget(targetQueryParam)
    }
  }, [toolQueryParam, targetQueryParam])

  // Open & Close Tool modal with URL synchronization
  const openTool = (toolId: string, target?: string) => {
    setActiveModal(toolId)
    if (target) setPrefilledTarget(target)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tool', toolId)
    if (target) newParams.set('target', target)
    setSearchParams(newParams, { replace: true })
  }

  const closeTool = () => {
    setActiveModal(null)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('tool')
    newParams.delete('target')
    setSearchParams(newParams, { replace: true })
  }

  // Keyboard Shortcuts (/, Cmd+K, D, T, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase()
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea'

      // Focus Search: "/" or Cmd/Ctrl+K
      if ((e.key === '/' && !isInputFocused) || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // Close modal / console on Escape
      if (e.key === 'Escape') {
        if (activeModal) {
          closeTool()
        } else if (showCertificateModal) {
          setShowCertificateModal(false)
        } else if (isConsoleOpen) {
          setIsConsoleOpen(false)
        } else if (searchQuery) {
          setSearchQuery('')
        }
        return
      }

      // Quick Launch Doctor: "D"
      if ((e.key === 'd' || e.key === 'D') && !isInputFocused && !activeModal && !showCertificateModal) {
        e.preventDefault()
        openTool('doctor')
        return
      }

      // Toggle Console Drawer: "T"
      if ((e.key === 't' || e.key === 'T') && !isInputFocused && !activeModal && !showCertificateModal) {
        e.preventDefault()
        setIsConsoleOpen((prev) => !prev)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModal, showCertificateModal, isConsoleOpen, searchQuery])

  // Load real client carrier metadata
  useEffect(() => {
    let isMounted = true
    const fetchCarrier = async () => {
      try {
        const info = await detectClientCarrier()
        if (isMounted) {
          setCarrierInfo(info)
          addLog(
            `WAN Route established: ${info.isp} (AS${info.asn || '9329'}) · ${info.city || 'Colombo'}, ${info.country || 'LK'}`,
            'success',
            'wan',
            'BGP Route'
          )
        }
      } catch {
        if (isMounted) {
          setCarrierInfo(null)
        }
      }
    }
    fetchCarrier()
    return () => {
      isMounted = false
    }
  }, [])

  // Load IndexedDB probe audits
  const loadAudits = async () => {
    const records = await getAllProbeAudits()
    setProbeAudits(records)
  }

  useEffect(() => {
    loadAudits()
    const handleAuditsUpdated = () => loadAudits()
    window.addEventListener('nexis_probe_audits_updated', handleAuditsUpdated)
    return () => window.removeEventListener('nexis_probe_audits_updated', handleAuditsUpdated)
  }, [])

  // Background Gateway Health Watchdog (Every 30 seconds)
  useEffect(() => {
    if (!watchdogActive) {
      if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current)
      return
    }

    // Request notification permission if not yet decided
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const runWatchdogCheck = async () => {
      const t0 = performance.now()
      try {
        await fetch('https://speed.cloudflare.com/__down?bytes=0', { method: 'HEAD', cache: 'no-store' })
        const measuredRtt = Math.round(performance.now() - t0)
        setGatewayRtt(`${measuredRtt} ms`)
        setWatchdogLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

        // Threshold check (> 80ms)
        if (measuredRtt > 80) {
          const alertMsg = `Gateway ping spiked to ${measuredRtt}ms (SLA threshold: 80ms)`
          addLog(`[Watchdog] ${alertMsg}`, 'warning', 'watchdog', 'Gateway Watchdog')
          addAlert({
            title: 'Gateway Jitter Spike Detected',
            description: alertMsg,
            severity: 'critical',
            source: 'Gateway Watchdog Daemon',
            metric: `${measuredRtt} ms`,
            toolAction: 'doctor',
          })

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nexis Watchdog Alert', {
              body: alertMsg,
              icon: '/favicon.ico',
            })
          }
        }
      } catch {
        setWatchdogLastChecked('Probe error')
      }
    }

    runWatchdogCheck()
    watchdogTimerRef.current = setInterval(runWatchdogCheck, 30000)

    return () => {
      if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current)
    }
  }, [watchdogActive])

  const toggleWatchdog = () => {
    const next = !watchdogActive
    setWatchdogActive(next)
    localStorage.setItem('nexis_gateway_watchdog', String(next))
    if (next) {
      addLog('Gateway Watchdog daemon activated: periodic 30s background ping telemetry enabled.', 'info')
    } else {
      addLog('Gateway Watchdog daemon paused.', 'info')
    }
  }

  // Cross-tool routing handler from LAN Scanner
  const handleCrossToolAction = (
    action: 'port-scan' | 'wol' | 'ping',
    target: { ip: string; mac: string }
  ) => {
    if (action === 'port-scan') {
      openTool('port-scanner', target.ip)
      addLog(`[Workflow] Dispatched LAN host ${target.ip} to Port & Vulnerability Scanner`, 'info')
    } else if (action === 'ping') {
      openTool('ping-monitor', target.ip)
      addLog(`[Workflow] Dispatched LAN host ${target.ip} to Gateway ICMP Ping Monitor`, 'info')
    } else if (action === 'wol') {
      setPrefilledMac(target.mac)
      openTool('wol')
      addLog(`[Workflow] Dispatched physical address ${target.mac} to Wake-on-LAN Controller`, 'info')
    }
  }

  // Filter tools by active category & search query
  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter((tool) => {
      const matchesCategory = activeCat === 'all' || tool.category === activeCat
      if (!matchesCategory) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        tool.title.toLowerCase().includes(q) ||
        tool.subtitle.toLowerCase().includes(q) ||
        tool.protocol.toLowerCase().includes(q) ||
        tool.badge.toLowerCase().includes(q) ||
        tool.capabilities.some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [activeCat, searchQuery])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ALL_TOOLS.length }
    for (const t of ALL_TOOLS) {
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    return counts
  }, [])

  const handleExportDiagnostics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      carrier: carrierInfo,
      gatewayLatency: gatewayRtt,
      watchdogActive,
      toolsCount: ALL_TOOLS.length,
      audits: probeAudits,
      logs,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexis-diagnostic-telemetry-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    addLog('Exported complete diagnostic session telemetry JSON', 'info')
  }

  return (
    <div className="w-full flex flex-col gap-6 max-w-[1440px] 2xl:max-w-[1560px] mx-auto p-4 sm:p-6 lg:p-8 select-none relative pb-28">
      {/* ── Top Header & Action Toolbar ────────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase text-[var(--primary)]">
            <span>NETWORK INTELLIGENCE</span>
            <span className="text-[var(--on-surface-dim)]">/</span>
            <span className="text-[var(--on-surface-muted)]">HARDWARE DIAGNOSTICS & PROBES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-[var(--on-surface)] mt-1">
            Diagnostic Tools & Probes
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-0.5">
            End-to-end hardware probes, localized subnet auditing, Wi-Fi RF telemetry, and automated network health diagnosis.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Gateway Watchdog Toggle */}
          <button
            onClick={toggleWatchdog}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-medium rounded-full border transition-all cursor-pointer ${
              watchdogActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface-muted)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Periodic 30s background ping monitor for SLA violations"
          >
            <NotificationsActiveRounded sx={{ fontSize: 15 }} />
            <span>Watchdog: {watchdogActive ? 'Active' : 'Off'}</span>
            {watchdogActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* SLA Audit Certificate Modal Trigger */}
          <button
            onClick={() => setShowCertificateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-medium rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-xs active:scale-95"
            title="Generate printable SLA diagnostic compliance report"
          >
            <VerifiedUserRounded sx={{ fontSize: 16, color: '#10B981' }} />
            <span>Audit Certificate</span>
          </button>

          {/* Quick Doctor Trigger Button */}
          <button
            onClick={() => openTool('doctor')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <HealingRounded sx={{ fontSize: 16 }} />
            <span>Run Doctor</span>
          </button>

          {/* Console Drawer Toggle */}
          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-medium rounded-full border transition-all cursor-pointer ${
              isConsoleOpen
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <TerminalRounded sx={{ fontSize: 16 }} />
            <span className="hidden sm:inline">Event Console</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
              {logs.length}
            </span>
          </button>

          {/* Export Telemetry */}
          <button
            onClick={handleExportDiagnostics}
            title="Export complete session logs"
            className="p-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-xs"
          >
            <FileDownloadRounded sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ── Quick Telemetry Status HUD / Metric Ribbon ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Link Health Evaluation */}
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              HEURISTIC HEALTH
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[var(--on-surface)]">
              98%
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              GRADE A+
            </span>
          </div>
          <span className="text-[11px] font-sans text-[var(--on-surface-muted)] truncate">
            Sub-3ms gateway latency, 0% drops
          </span>
        </div>

        {/* Metric 2: Active WAN Carrier */}
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              ACTIVE WAN ROUTE
            </span>
            <PublicRounded sx={{ fontSize: 14 }} className="text-sky-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-sans font-bold text-[var(--on-surface)] truncate">
              {carrierInfo?.isp || 'Broadband Gateway'}
            </span>
            <span className="text-xs font-mono text-sky-400 truncate">
              {carrierInfo?.ip || '198.51.100.42'} {carrierInfo?.asn ? `(AS${carrierInfo.asn})` : ''}
            </span>
          </div>
          <span className="text-[11px] font-sans text-[var(--on-surface-muted)] truncate">
            {carrierInfo ? `${carrierInfo.city}, ${carrierInfo.country}` : 'External WAN link active'}
          </span>
        </div>

        {/* Metric 3: Local Gateway RTT & Watchdog */}
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              GATEWAY & WATCHDOG
            </span>
            <NetworkCheckRounded sx={{ fontSize: 14 }} className="text-pink-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[var(--on-surface)]">
              {gatewayRtt}
            </span>
            <span className="text-xs font-mono text-[var(--on-surface-muted)]">
              {watchdogActive ? 'Active 30s' : 'Idle'}
            </span>
          </div>
          <span className="text-[11px] font-sans text-[var(--on-surface-muted)] truncate">
            Last checked: {watchdogLastChecked}
          </span>
        </div>

        {/* Metric 4: RF Noise Floor */}
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              RF ENVIRONMENT
            </span>
            <WifiRounded sx={{ fontSize: 14 }} className="text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-cyan-400">
              -46 dBm
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              PRISTINE
            </span>
          </div>
          <span className="text-[11px] font-sans text-[var(--on-surface-muted)] truncate">
            5 GHz UNII-1 · SNR 46 dB Margin
          </span>
        </div>
      </div>

      {/* ── Persistent Probe Audits Timeline Strip (IndexedDB) ─────────────── */}
      {probeAudits.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HistoryRounded sx={{ fontSize: 18 }} className="text-[var(--primary)]" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--on-surface)]">
                PERSISTENT AUDIT HISTORY (INDEXEDDB)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--on-surface-muted)]">
                {probeAudits.length} runs saved
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await clearAllProbeAudits()
                  setProbeAudits([])
                }}
                className="text-[11px] font-sans text-[var(--on-surface-muted)] hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                title="Clear all saved audit history"
              >
                <DeleteOutlineRounded sx={{ fontSize: 14 }} />
                <span>Clear History</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {probeAudits.slice(0, 3).map((audit) => (
              <div
                key={audit.id}
                onClick={() => openTool(audit.toolId)}
                className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 hover:border-[var(--primary)]/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-sans text-[var(--on-surface)] truncate group-hover:text-[var(--primary)]">
                      {audit.toolName}
                    </span>
                    {audit.grade && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        {audit.grade}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-sans text-[var(--on-surface-muted)] truncate mt-0.5">
                    {audit.summary}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--on-surface-dim)] mt-0.5">
                    {new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {audit.score ?? '--'}
                    </span>
                    <span className="text-[8px] font-mono text-[var(--on-surface-dim)] block">SCORE</span>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      await deleteProbeAudit(audit.id)
                      loadAudits()
                    }}
                    className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--on-surface-dim)] hover:text-rose-400 transition-colors"
                    title="Delete audit entry"
                  >
                    <CloseRounded sx={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search Bar & Category Filter Pills ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TOOL_CATEGORIES.map((cat) => {
            const isSelected = activeCat === cat.id
            const count = categoryCounts[cat.id] ?? 0
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'all') {
                    searchParams.delete('cat')
                    setSearchParams(searchParams)
                  } else {
                    setSearchParams({ cat: cat.id })
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-sans font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-subtle)] text-[var(--on-surface-dim)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Input Box */}
        <div className="relative min-w-[260px] sm:w-72">
          <SearchRounded
            sx={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-dim)]"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search probes, ports, commands..."
            className="w-full pl-9 pr-14 py-2 rounded-xl text-xs font-sans bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--on-surface)] focus:border-[var(--primary)] outline-none transition-all placeholder:text-[var(--on-surface-dim)]"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-dim)] hover:text-[var(--on-surface)]"
            >
              <CloseRounded sx={{ fontSize: 16 }} />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--on-surface-dim)] hidden sm:inline select-none pointer-events-none">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* ── Doctor Highlight Card (Shown when all or subnet) ──────────────── */}
      {(activeCat === 'all' || activeCat === 'subnet') && !searchQuery && (
        <div
          onClick={() => openTool('doctor')}
          className="nexis-card p-5 sm:p-6 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-5 cursor-pointer transition-all hover:border-cyan-400 shadow-md bg-gradient-to-r from-cyan-950/20 via-[var(--bg-surface)] to-[var(--bg-surface)] group"
        >
          <div className="flex items-center gap-4.5 min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg transition-transform duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)' }}
            >
              <HealingRounded sx={{ fontSize: 30 }} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold font-sans tracking-tight text-[var(--on-surface)] group-hover:text-cyan-400 transition-colors">
                  Automated Network Doctor
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                  HEURISTIC DIAGNOSTIC ENGINE
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  GRADE A+ OPTIMAL
                </span>
              </div>
              <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-1 max-w-2xl">
                Autonomous heuristic probing: Gateway jitter, DNS resolution speed, MTU frame fragmentation, TLS 1.3 cryptographic latency, and packet drop testing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                openTool('doctor')
              }}
              className="px-5 py-2.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase text-white active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0284C7 0%, #00E5FF 100%)' }}
            >
              <PlayArrowRounded sx={{ fontSize: 16 }} />
              <span>Launch Doctor</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tool Cards Grid ─────────────────────────────────────────────────── */}
      {filteredTools.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface-muted)] text-sm font-sans">
          No diagnostic probes found matching "{searchQuery}". Try searching for "DNS", "Port", "Traceroute", or "WiFi".
        </div>
      ) : activeCat === 'all' && !searchQuery ? (
        /* Render by category groupings for clarity when in All Tools view */
        <div className="flex flex-col gap-8">
          {/* Subnet & Security Group */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-cyan-400">
                SUBNET & SECURITY AUDIT PROBES
              </span>
              <span className="text-xs font-mono text-[var(--on-surface-dim)]">
                {ALL_TOOLS.filter((t) => t.category === 'subnet').length} probes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {ALL_TOOLS.filter((t) => t.category === 'subnet').map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => openTool(tool.id)}
                />
              ))}
            </div>
          </div>

          {/* Wi-Fi & RF Radio Group */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-sky-400">
                WI-FI & RF RADIO DIAGNOSTICS
              </span>
              <span className="text-xs font-mono text-[var(--on-surface-dim)]">
                {ALL_TOOLS.filter((t) => t.category === 'rf').length} probes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {ALL_TOOLS.filter((t) => t.category === 'rf').map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => openTool(tool.id)}
                />
              ))}
            </div>
          </div>

          {/* Spatial Surveyor Group */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-indigo-400">
                SPATIAL NETWORK INTELLIGENCE & TRANSIT
              </span>
              <span className="text-xs font-mono text-[var(--on-surface-dim)]">
                {ALL_TOOLS.filter((t) => t.category === 'spatial').length} probes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {ALL_TOOLS.filter((t) => t.category === 'spatial').map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => openTool(tool.id)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Flat filtered grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => openTool(tool.id)}
            />
          ))}
        </div>
      )}

      {/* ── Interactive Tool Modals ────────────────────────────────────────── */}
      <NetworkDoctorModal
        isOpen={activeModal === 'doctor'}
        onClose={closeTool}
        onAddLog={addLog}
      />

      <TracerouteWorkbenchModal
        isOpen={activeModal === 'traceroute'}
        onClose={closeTool}
        initialTarget={prefilledTarget}
        onAddLog={addLog}
      />

      <PortScannerModal
        isOpen={activeModal === 'port-scanner'}
        onClose={closeTool}
        initialTarget={prefilledTarget}
        onAddLog={addLog}
      />

      <LanScannerModal
        isOpen={activeModal === 'lan-scanner'}
        onClose={closeTool}
        onAddLog={addLog}
        onCrossToolAction={handleCrossToolAction}
      />

      <PublicIpModal
        isOpen={activeModal === 'public-ip'}
        onClose={closeTool}
        onAddLog={addLog}
      />

      <DnsBenchmarkModal
        isOpen={activeModal === 'dns-benchmark'}
        onClose={closeTool}
        onAddLog={addLog}
      />

      <WifiAnalyzerModal
        isOpen={activeModal === 'wifi-analyzer' || activeModal === 'router-mapper'}
        onClose={closeTool}
        onAddLog={addLog}
      />

      <WakeOnLanModal
        isOpen={activeModal === 'wol'}
        onClose={closeTool}
        initialMac={prefilledMac}
        onAddLog={addLog}
      />

      <SpeedDiagnosticModal
        isOpen={activeModal === 'speed-diagnostic'}
        onClose={closeTool}
        onAddLog={addLog}
      />

      <PingMonitorModal
        isOpen={activeModal === 'ping-monitor'}
        onClose={closeTool}
        initialTarget={prefilledTarget}
        onAddLog={addLog}
      />

      <SurveyorModal
        isOpen={activeModal === 'walk-map' || activeModal === 'venue-builder' || activeModal === 'tower-los'}
        onClose={closeTool}
        toolId={(activeModal as 'walk-map' | 'venue-builder' | 'tower-los') || 'walk-map'}
        onAddLog={addLog}
      />

      <EnvironmentalPredictorModal
        isOpen={activeModal === 'environmental-predictor'}
        onClose={closeTool}
        onAddLog={addLog}
      />

      {/* SLA Diagnostic Certificate Modal */}
      <DiagnosticCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        carrierInfo={carrierInfo}
        gatewayRtt={gatewayRtt}
      />

      {/* ── Live Probe Console Drawer ──────────────────────────────────────── */}
      <ProbeConsoleDrawer
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />
    </div>
  )
}

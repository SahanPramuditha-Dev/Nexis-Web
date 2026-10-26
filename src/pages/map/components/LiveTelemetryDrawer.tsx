import { useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import SensorsRounded from '@mui/icons-material/SensorsRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import MyLocationRounded from '@mui/icons-material/MyLocationRounded'
import SpeedRounded from '@mui/icons-material/SpeedRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import TimerRounded from '@mui/icons-material/TimerRounded'
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import type { LiveTelemetryEvent } from '@/data/supabaseClient'

interface LiveTelemetryDrawerProps {
  isOpen: boolean
  onClose: () => void
  events: LiveTelemetryEvent[]
  isStreaming: boolean
  onToggleStreaming: () => void
  isSimulationActive: boolean
  onToggleSimulation: () => void
  onClearEvents: () => void
  onLocateEvent: (event: LiveTelemetryEvent) => void
  isSupabaseConnected: boolean
}

function getCarrierBadgeColor(carrierName: string): { bg: string; text: string; border: string } {
  const c = carrierName.toLowerCase()
  if (c.includes('dialog')) {
    return { bg: 'rgba(255, 122, 0, 0.12)', text: '#FF7A00', border: 'rgba(255, 122, 0, 0.3)' }
  }
  if (c.includes('mobitel') || c.includes('slt')) {
    return { bg: 'rgba(0, 200, 83, 0.12)', text: '#00C853', border: 'rgba(0, 200, 83, 0.3)' }
  }
  if (c.includes('airtel')) {
    return { bg: 'rgba(255, 51, 75, 0.12)', text: '#FF334B', border: 'rgba(255, 51, 75, 0.3)' }
  }
  if (c.includes('hutch')) {
    return { bg: 'rgba(255, 145, 0, 0.12)', text: '#FF9100', border: 'rgba(255, 145, 0, 0.3)' }
  }
  if (c.includes('starlink')) {
    return { bg: 'rgba(0, 229, 255, 0.12)', text: '#00E5FF', border: 'rgba(0, 229, 255, 0.3)' }
  }
  return { bg: 'rgba(168, 85, 247, 0.12)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' }
}

function getRelativeTime(timestamp: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
  if (diffSec < 3) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

export function LiveTelemetryDrawer({
  isOpen,
  onClose,
  events,
  isStreaming,
  onToggleStreaming,
  isSimulationActive,
  onToggleSimulation,
  onClearEvents,
  onLocateEvent,
  isSupabaseConnected,
}: LiveTelemetryDrawerProps) {
  const [selectedFilter, setSelectedFilter] = useState<'All' | '5G' | 'LTE' | 'WIFI'>('All')

  if (!isOpen) return null

  const filteredEvents =
    selectedFilter === 'All'
      ? events
      : events.filter((e) => (selectedFilter === 'WIFI' ? e.networkType === 'WIFI' : e.networkType === selectedFilter))

  const avgDownload =
    events.length > 0
      ? (events.reduce((sum, e) => sum + e.downloadMbps, 0) / events.length).toFixed(1)
      : '0.0'

  const avgLatency =
    events.length > 0
      ? (events.reduce((sum, e) => sum + e.latencyMs, 0) / events.length).toFixed(1)
      : '0.0'

  return (
    <div className="fixed inset-y-0 right-0 z-[1250] w-full max-w-[420px] bg-[var(--surface)]/98 backdrop-blur-2xl border-l border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span
                className={`w-3 h-3 rounded-full ${
                  isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {isStreaming && (
                <span className="absolute w-5 h-5 rounded-full bg-emerald-500/40 animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight text-[var(--on-surface)]">
                  Live Telemetry Feed
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-bold text-[var(--primary)]">
                  {isSupabaseConnected ? 'WS LIVE' : 'SIMULATOR'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--on-surface-muted)]">
                Real-time crowdsourced RF pings across network probes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <CloseRounded sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Live Controls Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]/60 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleStreaming}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                isStreaming
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}
              title={isStreaming ? 'Pause incoming stream' : 'Resume live stream'}
            >
              {isStreaming ? (
                <>
                  <PauseRounded sx={{ fontSize: 15 }} />
                  <span>Streaming</span>
                </>
              ) : (
                <>
                  <PlayArrowRounded sx={{ fontSize: 15 }} />
                  <span>Paused</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleSimulation}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                isSimulationActive
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] border-[var(--border-subtle)] hover:text-[var(--on-surface)]'
              }`}
              title="Simulate continuous live probe speed tests for testing"
            >
              <AutoFixHighRounded sx={{ fontSize: 15 }} />
              <span>Simulate</span>
            </button>
          </div>

          {events.length > 0 && (
            <button
              type="button"
              onClick={onClearEvents}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[var(--on-surface-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Clear telemetry history"
            >
              <DeleteOutlineRounded sx={{ fontSize: 16 }} />
              <span className="text-[11px]">Clear</span>
            </button>
          )}
        </div>

        {/* Aggregate Ticker */}
        <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-center text-xs">
          <div>
            <span className="text-[10px] text-[var(--on-surface-muted)] block">Live Packets</span>
            <span className="font-mono font-extrabold text-[var(--on-surface)]">
              {events.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--on-surface-muted)] block">Avg Downlink</span>
            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {avgDownload} <span className="text-[9px]">Mbps</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--on-surface-muted)] block">Avg Latency</span>
            <span className="font-mono font-extrabold text-[var(--primary)]">
              {avgLatency} <span className="text-[9px]">ms</span>
            </span>
          </div>
        </div>

        {/* Radio Filter Chips */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {(['All', '5G', 'LTE', 'WIFI'] as const).map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => setSelectedFilter(tech)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedFilter === tech
                  ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
              }`}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Stream List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--on-surface-muted)] gap-3">
            <SensorsRounded sx={{ fontSize: 42 }} className="opacity-40 animate-pulse" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[var(--on-surface)]">
                Listening for Live Telemetry...
              </span>
              <span className="text-xs">
                As users complete speed tests across the network, verified records appear here in real time.
              </span>
            </div>
            {!isSimulationActive && (
              <button
                type="button"
                onClick={onToggleSimulation}
                className="mt-2 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-md hover:opacity-90 cursor-pointer"
              >
                Start Demo Probe Simulator
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const badge = getCarrierBadgeColor(evt.carrierName)
            return (
              <div
                key={evt.id}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--primary)]/50 transition-all flex flex-col gap-2 shadow-xs group"
              >
                {/* Top Row: Carrier + Radio Type + Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        borderColor: badge.border,
                      }}
                    >
                      {evt.carrierName}
                    </span>

                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--bg-subtle)] text-[var(--on-surface-muted)]">
                      {evt.networkType === 'WIFI' ? 'Wi-Fi' : evt.networkType}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[var(--on-surface-muted)] shrink-0">
                    {getRelativeTime(evt.createdAt)}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-xs py-1 px-2 rounded-xl bg-[var(--bg-subtle)]/60">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[var(--on-surface-muted)] flex items-center gap-0.5">
                      <ArrowDownwardRounded sx={{ fontSize: 11 }} /> Downlink
                    </span>
                    <span className="font-mono font-bold text-[var(--on-surface)]">
                      {evt.downloadMbps.toFixed(1)}{' '}
                      <span className="text-[9px] font-normal">Mbps</span>
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-[var(--on-surface-muted)] flex items-center gap-0.5">
                      <ArrowUpwardRounded sx={{ fontSize: 11 }} /> Uplink
                    </span>
                    <span className="font-mono font-bold text-[var(--on-surface)]">
                      {evt.uploadMbps.toFixed(1)}{' '}
                      <span className="text-[9px] font-normal">Mbps</span>
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-[var(--on-surface-muted)] flex items-center gap-0.5">
                      <TimerRounded sx={{ fontSize: 11 }} /> Latency
                    </span>
                    <span className="font-mono font-bold text-[var(--on-surface)]">
                      {evt.latencyMs.toFixed(1)}{' '}
                      <span className="text-[9px] font-normal">ms</span>
                    </span>
                  </div>
                </div>

                {/* Location and Locate Action */}
                <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-muted)] pt-0.5">
                  <div className="flex items-center gap-1 truncate">
                    <CellTowerRounded sx={{ fontSize: 13 }} className="opacity-70 shrink-0" />
                    <span className="truncate">{evt.city || 'Regional Hub'}</span>
                    <span className="font-mono text-[10px] opacity-70">
                      ({evt.latitude.toFixed(2)}, {evt.longitude.toFixed(2)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLocateEvent(evt)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    <MyLocationRounded sx={{ fontSize: 13 }} />
                    <span>Locate</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

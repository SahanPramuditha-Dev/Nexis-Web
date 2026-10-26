import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import { getStoredAlerts, saveStoredAlerts, type AlertItem } from '@/data/alertsService'

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(() => getStoredAlerts())
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('all')

  useEffect(() => {
    const handleSync = () => setAlerts(getStoredAlerts())
    window.addEventListener('nexis_alerts_updated', handleSync)
    return () => window.removeEventListener('nexis_alerts_updated', handleSync)
  }, [])

  const toggleAcknowledge = (id: string) => {
    setAlerts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, acknowledged: !a.acknowledged } : a))
      saveStoredAlerts(updated)
      return updated
    })
  }

  const markAllAcknowledged = () => {
    setAlerts((prev) => {
      const updated = prev.map((a) => ({ ...a, acknowledged: true }))
      saveStoredAlerts(updated)
      return updated
    })
  }

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unacknowledged') return !a.acknowledged
    if (filter === 'critical') return a.severity === 'critical'
    return true
  })

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length

  return (
    <div className="flex flex-col gap-6 max-w-[1240px] mx-auto p-4 sm:p-6 md:p-8 select-none">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            <span>NETWORK INTELLIGENCE</span>
            <span>/</span>
            <span>SLA & TELEMETRY ALERTS</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans"
              style={{ color: 'var(--on-surface)' }}
            >
              Incident & Telemetry Feed
            </h1>
            {unacknowledgedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {unacknowledgedCount} Active
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-sans mt-0.5 text-[var(--on-surface-muted)]">
            Real-time incident log monitoring gateway packet loss, radio interference, and carrier SLA anomalies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unacknowledgedCount > 0 && (
            <button
              onClick={markAllAcknowledged}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--on-surface)' }}
            >
              <DoneAllRounded sx={{ fontSize: 16 }} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Metrics Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="nexis-card p-4 rounded-2xl border flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              Active Incidents
            </span>
            <span className="text-2xl font-black font-mono text-[var(--on-surface)] mt-1">
              {unacknowledgedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400">
            <WarningAmberRounded sx={{ fontSize: 22 }} />
          </div>
        </div>

        <div
          className="nexis-card p-4 rounded-2xl border flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              MTTR (Mean Time to Resolve)
            </span>
            <span className="text-2xl font-black font-mono text-[var(--on-surface)] mt-1">
              3.4 min
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/15 text-[var(--primary)]">
            <CheckCircleOutlineRounded sx={{ fontSize: 22 }} />
          </div>
        </div>

        <div
          className="nexis-card p-4 rounded-2xl border flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              Subnet SLA Availability
            </span>
            <span className="text-2xl font-black font-mono text-[var(--color-success)] mt-1">
              99.94%
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400">
            <NotificationsActiveRounded sx={{ fontSize: 22 }} />
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filter === 'all'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
          }`}
        >
          All Feed ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('unacknowledged')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filter === 'unacknowledged'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
          }`}
        >
          Unacknowledged ({unacknowledgedCount})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filter === 'critical'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
          }`}
        >
          Critical
        </button>
      </div>

      {/* ── Alerts Feed List ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-2xl text-xs text-[var(--on-surface-dim)]">
            No alerts matching current filter. All platform telemetry is running nominal.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                alert.acknowledged
                  ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-70'
                  : 'border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--bg-surface)] shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-500/15 text-rose-400'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-cyan-500/15 text-cyan-400'
                  }`}
                >
                  {alert.severity === 'critical' ? (
                    <ErrorOutlineRounded sx={{ fontSize: 22 }} />
                  ) : alert.severity === 'warning' ? (
                    <WarningAmberRounded sx={{ fontSize: 22 }} />
                  ) : (
                    <InfoOutlined sx={{ fontSize: 22 }} />
                  )}
                </div>

                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold font-sans text-[var(--on-surface)]">
                      {alert.title}
                    </h3>
                    <span
                      className={`text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    {alert.metric && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--on-surface-muted)]">
                        {alert.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                    {alert.description}
                  </p>
                  <div className="text-[11px] font-mono text-[var(--on-surface-dim)] flex items-center gap-2 mt-0.5">
                    <span>Source: {alert.source}</span>
                    <span>·</span>
                    <span>{alert.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {alert.toolAction && (
                  <Link
                    to={`/tools?tool=${alert.toolAction}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--on-surface)] hover:text-[var(--primary)] border border-[var(--border-subtle)] transition-all cursor-pointer"
                  >
                    <PlayArrowRounded sx={{ fontSize: 14 }} />
                    <span>Run Probe</span>
                  </Link>
                )}
                <button
                  onClick={() => toggleAcknowledge(alert.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    alert.acknowledged
                      ? 'border-[var(--border-subtle)] text-[var(--on-surface-dim)] hover:bg-[var(--bg-subtle)]'
                      : 'border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white'
                  }`}
                >
                  {alert.acknowledged ? 'Unresolve' : 'Acknowledge'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

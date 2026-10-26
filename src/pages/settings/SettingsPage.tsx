import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PersonRounded from '@mui/icons-material/PersonRounded'
import CloudOffRounded from '@mui/icons-material/CloudOffRounded'
import LockRounded from '@mui/icons-material/LockRounded'
import SecurityRounded from '@mui/icons-material/SecurityRounded'
import VpnKeyRounded from '@mui/icons-material/VpnKeyRounded'
import StorageRounded from '@mui/icons-material/StorageRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded'
import FileUploadRounded from '@mui/icons-material/FileUploadRounded'
import LaunchRounded from '@mui/icons-material/LaunchRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import ToggleOnRounded from '@mui/icons-material/ToggleOnRounded'
import ToggleOffRounded from '@mui/icons-material/ToggleOffRounded'
import PolicyRounded from '@mui/icons-material/PolicyRounded'
import { useSettingsStore } from '@/stores/settingsStore'
import { useHistoryStore } from '@/stores/historyStore'
import { countMeasurements, getAllMeasurements } from '@/data/db'
import { exportToJson, parseImportJson } from '@/data/models'

export function SettingsPage() {
  const {
    theme,
    toggleTheme,
    openCellIdToken,
    setOpenCellIdToken,
    shareCrowdsourcedTelemetry,
    setShareCrowdsourcedTelemetry,
    enableCoordinateFuzzing,
    setEnableCoordinateFuzzing,
    maskIpAddress,
    setMaskIpAddress,
    ephemeralProbeId,
    regenerateProbeId,
  } = useSettingsStore()
  const { clearAll, importRecords } = useHistoryStore()
  const [tokenInput, setTokenInput] = useState<string>(openCellIdToken || '')
  const [recordCount, setRecordCount] = useState<number>(0)
  const [confirmClear, setConfirmClear] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const showStatus = (msg: string) => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg((cur) => (cur === msg ? null : cur)), 3000)
  }

  const refreshCount = () => {
    countMeasurements().then(setRecordCount)
  }

  useEffect(() => {
    refreshCount()
  }, [])

  const handleExportBackup = async () => {
    const all = await getAllMeasurements()
    if (all.length === 0) {
      showStatus('No measurements stored to export.')
      return
    }
    const jsonStr = exportToJson(all)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nexis-telemetry-backup-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showStatus(`Exported ${all.length} measurements to JSON`)
  }

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string
        const parsed = parseImportJson(text)
        if (parsed.length === 0) {
          showStatus('No valid measurement records in backup.')
          return
        }
        const count = await importRecords(parsed)
        refreshCount()
        showStatus(`Restored ${count} measurements from backup!`)
      } catch (err) {
        showStatus(`Import failed: ${err instanceof Error ? err.message : 'Invalid JSON file'}`)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleClear = async () => {
    await clearAll()
    setConfirmClear(false)
    refreshCount()
    showStatus('IndexedDB cache wiped clean.')
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1240px] mx-auto p-4 sm:p-6 md:p-8 select-none">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            <span>SYSTEM PREFERENCES</span>
            <span>/</span>
            <span>CONFIGURATION</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans mt-1"
            style={{ color: 'var(--on-surface)' }}
          >
            Engine settings
          </h1>
          <p className="text-xs sm:text-sm font-sans mt-0.5 text-[var(--on-surface-muted)]">
            Privacy controls, hardware-accelerated telemetry, and client database management.
          </p>
        </div>
      </div>

      {/* ── User Profile Header Card ──────────────────────────────────────── */}
      <div className="nexis-card p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 border-2 text-white shadow-md"
            style={{
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              borderColor: 'var(--primary)',
            }}
          >
            <PersonRounded sx={{ fontSize: 34 }} />
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
            <h2 className="text-lg font-bold font-sans text-[var(--on-surface)]">
              Anonymous Edge Contributor
            </h2>
            <p className="text-xs font-mono text-[var(--on-surface-muted)]">
              {ephemeralProbeId}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans font-semibold border"
                style={{
                  backgroundColor: shareCrowdsourcedTelemetry
                    ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                    : 'color-mix(in srgb, var(--on-surface-dim) 12%, transparent)',
                  borderColor: shareCrowdsourcedTelemetry
                    ? 'color-mix(in srgb, var(--color-success) 25%, transparent)'
                    : 'var(--border-subtle)',
                  color: shareCrowdsourcedTelemetry ? 'var(--color-success)' : 'var(--on-surface-muted)',
                }}
              >
                {shareCrowdsourcedTelemetry ? (
                  <>
                    <LockRounded sx={{ fontSize: 13 }} />
                    <span>Crowdsource Telemetry: Active</span>
                  </>
                ) : (
                  <>
                    <CloudOffRounded sx={{ fontSize: 13 }} />
                    <span>Crowdsource Telemetry: Paused</span>
                  </>
                )}
              </span>

              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans font-semibold border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                <SecurityRounded sx={{ fontSize: 13 }} />
                <span>Zero-Trust Verification Pipeline</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rotate Ephemeral Probe Pseudonym */}
        <button
          type="button"
          onClick={() => {
            const fresh = regenerateProbeId()
            showStatus(`Rotated anonymous probe ID to ${fresh}`)
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-sans font-semibold border bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <RefreshRounded sx={{ fontSize: 16 }} />
          <span>Rotate Ephemeral ID</span>
        </button>
      </div>

      {/* ── Privacy & Telemetry Control Section ────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            PRIVACY &amp; TELEMETRY CONTROL
          </span>
          <Link
            to="/privacy"
            className="inline-flex items-center gap-1 text-xs font-sans font-bold text-[var(--primary)] hover:underline"
          >
            <span>Read Privacy Policy</span>
            <LaunchRounded sx={{ fontSize: 14 }} />
          </Link>
        </div>

        <div className="nexis-card p-5 sm:p-6 flex flex-col gap-4">
          {/* Toggle 1: Crowdsourced Telemetry Sharing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--primary)]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
              >
                <SecurityRounded sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
                  Contribute to Community Coverage Map
                </h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                  Upload anonymized radio signal &amp; speed benchmarks to the public S2 spatial grid
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !shareCrowdsourcedTelemetry
                setShareCrowdsourcedTelemetry(next)
                showStatus(next ? 'Crowdsourced sharing enabled' : 'Crowdsourced sharing paused')
              }}
              className="cursor-pointer text-[var(--primary)] hover:opacity-80 transition-opacity"
            >
              {shareCrowdsourcedTelemetry ? (
                <ToggleOnRounded sx={{ fontSize: 38 }} />
              ) : (
                <ToggleOffRounded sx={{ fontSize: 38, color: 'var(--on-surface-muted)' }} />
              )}
            </button>
          </div>

          {/* Toggle 2: Differential Coordinate Fuzzing */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--color-success)]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)' }}
              >
                <VpnKeyRounded sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
                  Differential Coordinate Fuzzing
                </h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                  Snap measurements to Google S2 Level 13 polygons (~1.2 km precision), preventing pinpointing of private addresses
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !enableCoordinateFuzzing
                setEnableCoordinateFuzzing(next)
                showStatus(next ? 'S2 coordinate fuzzing enabled' : 'Raw coordinates allowed')
              }}
              className="cursor-pointer text-[var(--color-success)] hover:opacity-80 transition-opacity"
            >
              {enableCoordinateFuzzing ? (
                <ToggleOnRounded sx={{ fontSize: 38 }} />
              ) : (
                <ToggleOffRounded sx={{ fontSize: 38, color: 'var(--on-surface-muted)' }} />
              )}
            </button>
          </div>

          {/* Toggle 3: Client IP Anonymization */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--primary)]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
              >
                <LockRounded sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
                  Client IP Anonymization (Subnet Masking)
                </h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                  Zero out host bits (/24 IPv4 subnet or /64 IPv6 prefix) before saving to remove personal ISP identifiers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !maskIpAddress
                setMaskIpAddress(next)
                showStatus(next ? 'Client IP masking enabled' : 'IP masking disabled')
              }}
              className="cursor-pointer text-[var(--primary)] hover:opacity-80 transition-opacity"
            >
              {maskIpAddress ? (
                <ToggleOnRounded sx={{ fontSize: 38 }} />
              ) : (
                <ToggleOffRounded sx={{ fontSize: 38, color: 'var(--on-surface-muted)' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {statusMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface)] text-[var(--on-surface)] border border-[var(--primary)] shadow-xl text-xs font-sans font-bold animate-in fade-in">
          <CheckCircleRounded sx={{ fontSize: 18, color: 'var(--primary)' }} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Hidden file input for backup restoration */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportBackup}
      />

      {/* ── RF Infrastructure & Real Cell Towers Section ──────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)] px-1">
          RF INFRASTRUCTURE &amp; LIVE CELL TOWERS
        </span>

        <div className="nexis-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--primary)] shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
              >
                <CellTowerRounded sx={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
                  OpenCelliD Live Base Station API
                </h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                  Connect to the world's largest open cell tower database to plot physical telecom antennas
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-sans font-bold px-2.5 py-1 rounded-full w-fit ${
                openCellIdToken
                  ? 'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/20'
                  : 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/20'
              }`}
            >
              {openCellIdToken ? 'LIVE SYNC ACTIVE' : 'BUNDLED VERIFIED ACTIVE'}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <label className="text-xs font-sans text-[var(--on-surface-muted)] flex items-center justify-between">
              <span>OpenCelliD API Token (Free 2,500 daily queries)</span>
              <a
                href="https://opencellid.org/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--primary)] hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Get Free Token</span>
                <LaunchRounded sx={{ fontSize: 13 }} />
              </a>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. pk.0a1b2c3d4e5f6g7h8i9j..."
                className="flex-1 px-3.5 py-2 rounded-xl text-xs font-mono border bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--on-surface)] focus:border-[var(--primary)] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setOpenCellIdToken(tokenInput)
                  showStatus('OpenCelliD API token saved!')
                }}
                className="px-4 py-2 rounded-xl text-xs font-sans font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all cursor-pointer active:scale-95 shrink-0"
              >
                Save Token
              </button>
            </div>
            <p className="text-[11px] font-sans text-[var(--on-surface-dim)]">
              When left blank, NEXIS uses bundled verified base stations across Sri Lanka and major metropolitan hubs without external network dependencies.
            </p>
          </div>
        </div>
      </div>

      {/* ── Local Storage Management ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            LOCAL DATABASE &amp; DATA RETENTION
          </span>
          <Link
            to="/history"
            className="inline-flex items-center gap-1 text-xs font-sans font-bold text-[var(--primary)] hover:underline"
          >
            <span>View Measurement Archive</span>
            <LaunchRounded sx={{ fontSize: 14 }} />
          </Link>
        </div>

        <div className="nexis-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--primary)]"
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
            >
              <StorageRounded sx={{ fontSize: 20 }} />
            </div>
            <div>
              <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
                Browser IndexedDB Cache
              </h4>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                {recordCount} benchmark runs stored locally on this machine
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Backup */}
            <button
              onClick={handleExportBackup}
              disabled={recordCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-sans font-semibold border bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              <FileDownloadRounded sx={{ fontSize: 15 }} />
              <span>Export Backup</span>
            </button>

            {/* Import Backup */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-sans font-semibold border bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all cursor-pointer active:scale-95"
            >
              <FileUploadRounded sx={{ fontSize: 15 }} />
              <span>Restore Backup</span>
            </button>

            {/* Clear All */}
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={recordCount === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-sans font-semibold border transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-danger) 25%, transparent)',
                  color: 'var(--color-danger)',
                }}
              >
                <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                <span>Clear All Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="px-3.5 py-2 text-xs font-sans font-semibold rounded-2xl bg-[var(--color-danger)] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3.5 py-2 text-xs font-sans font-semibold rounded-2xl border bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--on-surface)] cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Appearance Toggle ──────────────────────────────────────────────── */}
      <div className="nexis-card p-5 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--primary)]"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
          >
            {theme === 'dark' ? (
              <DarkModeRounded sx={{ fontSize: 20 }} />
            ) : (
              <LightModeRounded sx={{ fontSize: 20 }} />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
              Theme Appearance
            </h4>
            <p className="text-xs font-sans text-[var(--on-surface-muted)]">
              Currently in {theme === 'dark' ? 'Midnight Navy' : 'Clean Studio Light'} mode
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="px-4 py-2 rounded-2xl text-xs font-sans font-semibold border bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--on-surface)] transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          Toggle Theme
        </button>
      </div>

      {/* ── Governance, Legal & Documentation Card ─────────────────────────── */}
      <div className="nexis-card p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--primary)]"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
          >
            <PolicyRounded sx={{ fontSize: 20 }} />
          </div>
          <div>
            <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
              Privacy, Terms &amp; Documentation
            </h4>
            <p className="text-xs font-sans text-[var(--on-surface-muted)]">
              Review differential S2 fuzzing, acceptable diagnostic policies, and engineering guides.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/docs"
            className="px-3.5 py-2 rounded-2xl text-xs font-sans font-semibold border bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all"
          >
            Documentation
          </Link>
          <Link
            to="/privacy"
            className="px-3.5 py-2 rounded-2xl text-xs font-sans font-semibold border bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}

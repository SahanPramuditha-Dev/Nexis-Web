import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  IoArrowBack,
  IoLocationOutline,
  IoServerOutline,
  IoShieldCheckmarkOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoSpeedometerOutline,
  IoPulseOutline,
  IoTrashOutline,
  IoCopyOutline,
  IoDownloadOutline,
  IoPricetagOutline,
  IoCheckmarkOutline,
  IoWarningOutline,
  IoCheckmarkCircle,
  IoChevronBack,
  IoChevronForward,
  IoGameControllerOutline,
  IoVideocamOutline,
  IoTvOutline,
  IoClose,
} from 'react-icons/io5'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { getMeasurementById } from '@/data/db'
import { useHistoryStore } from '@/stores/historyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  formatMbps,
  formatMs,
  qualityFromRecord,
  qualityColor,
  getQualityLabel,
  getAppReadiness,
  generateShareSummary,
  exportToJson,
  type MeasurementRecord,
} from '@/data/models'
import { NexisThroughputChart } from '@/design/components'

const PRESET_TAGS = ['#Office', '#LivingRoom', '#Bedroom', '#WiFi-5G', '#WiFi-2.4G', '#Ethernet', '#Mobile-5G', '#Starlink']

export function MeasurementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { records, load, deleteRecord, updateRecord } = useHistoryStore()
  const { theme } = useSettingsStore()
  const isDark = theme === 'dark'

  const [record, setRecord] = useState<MeasurementRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Tag & Note editing state
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load history records for session navigator
  useEffect(() => {
    load()
  }, [load])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur))
    }, 2500)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getMeasurementById(id).then((rec) => {
      if (rec) {
        setRecord(rec)
        setNotes(rec.notes || '')
        setTags(rec.tags || [])
      } else {
        setRecord(null)
      }
      setLoading(false)
    })
  }, [id])

  // Current record index and adjacent runs for the Floating Session Navigator
  const currentIndex = useMemo(() => {
    if (!records || !id) return -1
    return records.findIndex((r) => r.id === id)
  }, [records, id])

  const hasOlder = currentIndex >= 0 && currentIndex < records.length - 1
  const hasNewer = currentIndex > 0
  const olderRecord = hasOlder ? records[currentIndex + 1] : null
  const newerRecord = hasNewer ? records[currentIndex - 1] : null

  // Keyboard navigation between sessions (Left = Older, Right = Newer)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }

      if (e.key === 'ArrowLeft' && olderRecord) {
        navigate(`/history/${olderRecord.id}`)
      } else if (e.key === 'ArrowRight' && newerRecord) {
        navigate(`/history/${newerRecord.id}`)
      }
    },
    [olderRecord, newerRecord, navigate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSaveMetadata = async () => {
    if (!record) return
    await updateRecord(record.id, { notes, tags })
    setRecord((prev) => (prev ? { ...prev, notes, tags } : null))
    setHasUnsavedChanges(false)
    showToast('Tags and notes saved')
  }

  const handleToggleTag = (tag: string) => {
    let nextTags: string[]
    if (tags.includes(tag)) {
      nextTags = tags.filter((t) => t !== tag)
    } else {
      nextTags = [...tags, tag]
    }
    setTags(nextTags)
    setHasUnsavedChanges(true)
  }

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim()
    if (!trimmed) return
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    if (!tags.includes(formatted)) {
      setTags([...tags, formatted])
      setHasUnsavedChanges(true)
    }
    setCustomTagInput('')
  }

  const handleDeleteRecord = async () => {
    if (!record) return
    await deleteRecord(record.id)
    navigate('/history', { replace: true })
  }

  const handleCopySummary = () => {
    if (!record) return
    const summary = generateShareSummary(record)
    navigator.clipboard.writeText(summary)
    setCopied(true)
    showToast('Summary copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportJson = () => {
    if (!record) return
    const jsonStr = exportToJson([record])
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nexis-session-${record.id}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Exported session JSON')
  }

  // Shimmer Skeleton Loading
  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6 max-w-[1440px] 2xl:max-w-[1560px] mx-auto p-4 sm:p-6 lg:p-8 animate-pulse select-none">
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col gap-2">
            <div className="w-32 h-3 rounded-full bg-[var(--bg-subtle)]" />
            <div className="w-64 h-8 rounded-xl bg-[var(--bg-subtle)]" />
            <div className="w-48 h-3 rounded-full bg-[var(--bg-subtle)]" />
          </div>
          <div className="flex gap-2">
            <div className="w-20 h-8 rounded-full bg-[var(--bg-subtle)]" />
            <div className="w-20 h-8 rounded-full bg-[var(--bg-subtle)]" />
          </div>
        </div>

        <div className="h-32 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
          <div className="h-56 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="p-16 max-w-[1200px] mx-auto flex flex-col gap-4 text-center items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--on-surface-dim)] text-xl">
          <IoWarningOutline />
        </div>
        <p className="text-sm font-sans text-[var(--on-surface-muted)]">Measurement record not found or has been wiped.</p>
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sans font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all"
        >
          <IoArrowBack className="text-sm" />
          <span>Return to History</span>
        </Link>
      </div>
    )
  }

  const quality = qualityFromRecord(record)
  const qualityLabel = getQualityLabel(quality, record.lossPercent)
  const appReadiness = getAppReadiness(record)

  const dateStr = new Date(record.timestamp).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  return (
    <div className="w-full flex flex-col gap-6 max-w-[1440px] 2xl:max-w-[1560px] mx-auto p-4 sm:p-6 lg:p-8 select-none relative pb-20">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-surface)] text-[var(--on-surface)] border border-[var(--border-subtle)] shadow-[0_12px_32px_rgba(0,0,0,0.15)] backdrop-blur-2xl text-xs font-sans font-medium animate-in fade-in slide-in-from-bottom-2">
          <IoCheckmarkCircle className="text-sm text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Top Header Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase text-[var(--primary)]">
            <Link
              to="/history"
              className="hover:underline flex items-center gap-1 text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] transition-colors"
            >
              <IoArrowBack className="text-xs" />
              <span>TELEMETRY ARCHIVE</span>
            </Link>
            <span className="text-[var(--on-surface-dim)]">/</span>
            <span className="text-[var(--on-surface-muted)]">SESSION BREAKDOWN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-[var(--on-surface)] mt-1">
            Session Diagnostics
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-0.5">
            Recorded on {dateStr}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quality Pill */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-sans font-semibold uppercase tracking-wider rounded-full border"
            style={{
              backgroundColor: `${qualityColor(quality)}15`,
              borderColor: `${qualityColor(quality)}30`,
              color: qualityColor(quality),
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: qualityColor(quality) }}
            />
            <span>{qualityLabel}</span>
          </span>

          {/* Copy Summary */}
          <button
            onClick={handleCopySummary}
            title="Copy diagnostic summary"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-medium rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer active:scale-95"
          >
            {copied ? (
              <IoCheckmarkOutline className="text-sm text-emerald-500" />
            ) : (
              <IoCopyOutline className="text-sm" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            title="Export session data as JSON"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-medium rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer active:scale-95"
          >
            <IoDownloadOutline className="text-sm" />
            <span>JSON</span>
          </button>

          {/* Single Delete Button */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-medium rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer active:scale-95"
            >
              <IoTrashOutline className="text-sm" />
              <span>Delete</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDeleteRecord}
                className="px-3 py-1 text-xs font-sans font-semibold rounded-full bg-rose-500 text-white cursor-pointer active:scale-95"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs font-sans font-medium rounded-full border border-[var(--border-subtle)] text-[var(--on-surface)] cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Unified Hero Telemetry Card (Individual Apple Glass Tiles) ───────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Download */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
              DOWNLOAD SPEED
            </span>
            <IoArrowDownOutline className="text-xs text-[var(--primary)]" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                {record.downloadMbps !== null ? formatMbps(record.downloadMbps).split(' ')[0] : '—'}
              </span>
              <span className="text-xs font-sans text-[var(--on-surface-muted)]">Mbps</span>
            </div>
            <span className="text-[11px] font-sans text-[var(--on-surface-dim)] block mt-0.5">Peak bandwidth</span>
          </div>
        </div>

        {/* Upload */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
              UPLOAD SPEED
            </span>
            <IoArrowUpOutline className="text-xs text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                {record.uploadMbps !== null ? formatMbps(record.uploadMbps).split(' ')[0] : '—'}
              </span>
              <span className="text-xs font-sans text-[var(--on-surface-muted)]">Mbps</span>
            </div>
            <span className="text-[11px] font-sans text-[var(--on-surface-dim)] block mt-0.5">Burst stream</span>
          </div>
        </div>

        {/* Ping */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
              ROUND-TRIP PING
            </span>
            <IoSpeedometerOutline className="text-xs text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                {record.latencyMs !== null ? formatMs(record.latencyMs).split(' ')[0] : '—'}
              </span>
              <span className="text-xs font-sans text-[var(--on-surface-muted)]">ms</span>
            </div>
            <span className="text-[11px] font-sans text-[var(--on-surface-dim)] block mt-0.5">Median latency</span>
          </div>
        </div>

        {/* Jitter */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
              RFC 3550 JITTER
            </span>
            <IoPulseOutline className="text-xs text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                {record.jitterMs !== null ? formatMs(record.jitterMs).split(' ')[0] : '—'}
              </span>
              <span className="text-xs font-sans text-[var(--on-surface-muted)]">ms</span>
            </div>
            <span className="text-[11px] font-sans text-[var(--on-surface-dim)] block mt-0.5">Packet variance</span>
          </div>
        </div>

        {/* Packet Loss */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between col-span-2 sm:col-span-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
              PACKET LOSS
            </span>
            <IoWarningOutline className="text-xs text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-2xl sm:text-3xl font-bold font-sans tracking-tight ${
                  (record.lossPercent ?? 0) > 0 ? 'text-rose-500' : 'text-[var(--on-surface)]'
                }`}
              >
                {record.lossPercent !== null ? record.lossPercent.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs font-sans text-[var(--on-surface-muted)]">%</span>
            </div>
            <span className="text-[11px] font-sans text-[var(--on-surface-dim)] block mt-0.5">
              {(record.lossPercent ?? 0) > 0 ? 'Transmission drops' : 'Clean channel'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Telemetry Split (Balanced Heights) ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left Column: Diagnostics & Annotation */}
        <div className="flex flex-col gap-4">
          {/* Endpoint Details */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <IoServerOutline className="text-sm text-[var(--primary)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface)]">
                Network &amp; Server Details
              </h3>
            </div>

            <div className="flex flex-col gap-2 text-xs font-sans">
              <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)] gap-3">
                <span className="text-[var(--on-surface-muted)] shrink-0">Endpoint URL</span>
                <span className="font-mono text-[var(--on-surface)] truncate max-w-[260px] sm:max-w-[380px]" title={record.endpointUrl}>
                  {record.endpointUrl}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--on-surface-muted)]">Carrier / ISP</span>
                <span className="text-[var(--primary)] font-semibold">{record.isp ? `${record.isp}${record.asn ? ` (AS${record.asn})` : ''}` : 'SLT-Mobitel'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--on-surface-muted)]">Edge Colo Node</span>
                <span className="text-[var(--on-surface)] font-medium">{record.colo || 'Cloudflare Edge'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--on-surface-muted)]">Transport Protocol</span>
                <span className="text-[var(--on-surface)] font-medium">{record.methodVersion}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[var(--on-surface-muted)]">Diagnostic Duration</span>
                <span className="text-[var(--on-surface)] font-medium">{record.durationSec ?? '7.8'}s</span>
              </div>
            </div>
          </div>

          {/* Field Notes & Diagnostic Tags (Moved to Left to Balance Heights) */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <IoPricetagOutline className="text-sm text-[var(--primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface)]">
                  Field Notes &amp; Tags
                </h3>
              </div>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveMetadata}
                  className="px-3 py-1 rounded-full text-xs font-sans font-semibold bg-[var(--primary)] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  Save
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_TAGS.map((t) => {
                const active = tags.includes(t)
                return (
                  <button
                    key={t}
                    onClick={() => handleToggleTag(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-medium cursor-pointer transition-all ${
                      active
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                    }`}
                  >
                    {t}
                  </button>
                )
              })}
              {tags
                .filter((t) => !PRESET_TAGS.includes(t))
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => handleToggleTag(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium bg-[var(--primary)] text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <span>{t}</span>
                    <IoClose className="text-xs" />
                  </button>
                ))}
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                placeholder="Add custom tag..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                className="w-full text-xs font-sans py-1.5 px-3 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] outline-none focus:border-[var(--primary)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-dim)]"
              />
              <button
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 rounded-full text-xs font-sans font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--on-surface)] cursor-pointer"
              >
                Add
              </button>
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Session notes e.g. tested on 5GHz Wi-Fi during peak evening hours..."
              className="w-full p-2.5 text-xs font-sans rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] outline-none focus:border-[var(--primary)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-dim)] resize-none mt-1"
            />
          </div>
        </div>

        {/* Right Column: Spatial & Readiness Matrix */}
        <div className="flex flex-col gap-4">
          {/* Geographic Context & Embedded Map */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <IoLocationOutline className="text-sm text-[var(--primary)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface)]">
                  Geographic Context
                </h3>
              </div>
              {record.location && (
                <Link
                  to="/map"
                  className="text-[11px] font-sans font-medium text-[var(--primary)] hover:underline flex items-center gap-0.5"
                >
                  <span>Open Coverage Map</span>
                  <IoChevronForward className="text-xs" />
                </Link>
              )}
            </div>

            {record.location ? (
              <div className="flex flex-col gap-2.5">
                <div className="relative w-full h-[180px] rounded-xl overflow-hidden border border-[var(--border-subtle)] z-0 shadow-inner">
                  <MapContainer
                    center={[record.location.lat, record.location.lng]}
                    zoom={14}
                    scrollWheelZoom={false}
                    zoomControl={false}
                    attributionControl={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      url={
                        isDark
                          ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      }
                      maxZoom={19}
                    />
                    <CircleMarker
                      center={[record.location.lat, record.location.lng]}
                      radius={Math.min(26, Math.max(10, record.location.accuracyM / 4))}
                      pathOptions={{
                        color: '#0A84FF',
                        weight: 1.5,
                        fillColor: '#0A84FF',
                        fillOpacity: 0.15,
                      }}
                    />
                    <CircleMarker
                      center={[record.location.lat, record.location.lng]}
                      radius={5}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 2,
                        fillColor: '#0A84FF',
                        fillOpacity: 1,
                      }}
                    />
                  </MapContainer>
                  <div className="absolute top-2 right-2 z-[400] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--primary)] border border-[var(--border-subtle)] text-[9px] font-mono font-bold tracking-wider shadow-sm">
                    GPS FIX
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[var(--on-surface)] text-[12px] font-medium">
                      {record.location.lat.toFixed(5)}°, {record.location.lng.toFixed(5)}°
                    </span>
                  </div>
                  <span className="text-[var(--on-surface-muted)] text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-surface)]">
                    ±{Math.round(record.location.accuracyM)}m accuracy
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--on-surface-muted)] flex flex-col items-center justify-center text-center gap-2">
                <IoLocationOutline className="text-2xl text-[var(--on-surface-dim)]" />
                <span>No geographic coordinates recorded with this session.</span>
              </div>
            )}
          </div>

          {/* Application Readiness Matrix (Moved to Right under Map with 3-State Traffic Light Logic) */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <IoShieldCheckmarkOutline className="text-sm text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface)]">
                Application Suitability (ITU-T Standards)
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-sans pt-1">
              {/* Online Gaming */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                  <IoGameControllerOutline className="text-lg" />
                </div>
                <span className="font-semibold text-[var(--on-surface)] text-[11px]">Online Gaming</span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    appReadiness.gaming === 'excellent'
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                      : appReadiness.gaming === 'good'
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/25'
                      : 'bg-rose-500/15 text-rose-500 border-rose-500/25'
                  }`}
                >
                  {appReadiness.gaming === 'excellent' ? 'Optimal' : appReadiness.gaming === 'good' ? 'Good' : 'Laggy'}
                </span>
              </div>

              {/* HD Video Calls */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[var(--primary)]">
                  <IoVideocamOutline className="text-lg" />
                </div>
                <span className="font-semibold text-[var(--on-surface)] text-[11px]">HD Video Calls</span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    appReadiness.videoCall === 'excellent'
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                      : appReadiness.videoCall === 'good'
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/25'
                      : 'bg-rose-500/15 text-rose-500 border-rose-500/25'
                  }`}
                >
                  {appReadiness.videoCall === 'excellent' ? 'Clean' : appReadiness.videoCall === 'good' ? 'Fair' : 'Degraded'}
                </span>
              </div>

              {/* 4K Streaming */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <IoTvOutline className="text-lg" />
                </div>
                <span className="font-semibold text-[var(--on-surface)] text-[11px]">4K Streaming</span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    appReadiness.streaming === 'excellent'
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                      : appReadiness.streaming === 'good'
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/25'
                      : 'bg-rose-500/15 text-rose-500 border-rose-500/25'
                  }`}
                >
                  {appReadiness.streaming === 'excellent' ? 'Ready' : appReadiness.streaming === 'good' ? 'Buffer' : 'Slow'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Throughput Waveform ────────────────────────────────────────────── */}
      {record.samples && record.samples.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col gap-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <IoPulseOutline className="text-sm text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface)]">
              Recorded Throughput Waveform
            </h3>
          </div>
          <NexisThroughputChart
            samples={record.samples}
            isTesting={false}
            phase="COMPLETE"
            height={90}
          />
        </div>
      )}

      {/* ── Floating Session Navigator (Apple Dynamic Island) ─────────────── */}
      {records.length > 1 && currentIndex !== -1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.2)] text-xs font-sans text-[var(--on-surface)]">
          <button
            disabled={!hasOlder}
            onClick={() => olderRecord && navigate(`/history/${olderRecord.id}`)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              hasOlder ? 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]' : 'text-[var(--on-surface-dim)] cursor-not-allowed'
            }`}
            title="Older session (← Arrow)"
          >
            <IoChevronBack className="text-xs" />
            <span className="hidden sm:inline font-medium">Older</span>
          </button>

          <span className="text-[var(--on-surface-muted)] text-[11px] font-mono px-2">
            Run {records.length - currentIndex} of {records.length}
          </span>

          <button
            disabled={!hasNewer}
            onClick={() => newerRecord && navigate(`/history/${newerRecord.id}`)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              hasNewer ? 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]' : 'text-[var(--on-surface-dim)] cursor-not-allowed'
            }`}
            title="Newer session (Arrow →)"
          >
            <span className="hidden sm:inline font-medium">Newer</span>
            <IoChevronForward className="text-xs" />
          </button>
        </div>
      )}
    </div>
  )
}

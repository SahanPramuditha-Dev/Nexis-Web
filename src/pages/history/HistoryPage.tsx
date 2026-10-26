import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IoSpeedometerOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoPulseOutline,
  IoTimeOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoChevronForward,
  IoLocationOutline,
  IoWarningOutline,
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoTrashOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoGitCompareOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoCloudUploadOutline,
  IoLayersOutline,
  IoStatsChartOutline,
  IoChevronDown,
  IoChevronUp,
  IoCalendarOutline,
  IoAddOutline,
  IoPricetagOutline,
  IoPlayOutline,
  IoPrintOutline,
  IoEllipsisHorizontal,
} from 'react-icons/io5'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

import { useHistoryStore } from '@/stores/historyStore'
import {
  formatMbps,
  formatMs,
  qualityFromRecord,
  qualityColor,
  getQualityLabel,
  formatRelativeTime,
  exportToCsv,
  exportToJson,
  parseImportJson,
  generateShareSummary,
  type MeasurementRecord,
} from '@/data/models'
import { median } from '@/measurement/math'
import { NexisThroughputChart, NexisDropdown, type DropdownOption } from '@/design/components'

type FilterMode = 'all' | 'fast' | 'high_latency' | 'packet_loss' | 'geotagged'
type SortMode = 'newest' | 'oldest' | 'fastest_dl' | 'lowest_latency'

const SORT_OPTIONS: DropdownOption<SortMode>[] = [
  {
    value: 'newest',
    label: 'Newest First',
    sublabel: 'Recent benchmarks',
    icon: <IoTimeOutline className="text-sm" />,
  },
  {
    value: 'oldest',
    label: 'Oldest First',
    sublabel: 'Earliest records',
    icon: <IoTimeOutline className="text-sm" />,
  },
  {
    value: 'fastest_dl',
    label: 'Fastest Download',
    sublabel: 'Top bandwidth throughput',
    icon: <IoArrowDownOutline className="text-sm" />,
  },
  {
    value: 'lowest_latency',
    label: 'Lowest Latency',
    sublabel: 'Minimal node ping',
    icon: <IoSpeedometerOutline className="text-sm" />,
  },
]

function getDateGroupTitle(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const sevenDaysAgo = today - 7 * 86400000

  const testDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  if (testDay === today) return 'Today'
  if (testDay === yesterday) return 'Yesterday'
  if (testDay > sevenDaysAgo) return 'Earlier This Week'
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function CustomTrendTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  return (
    <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl backdrop-blur-2xl text-xs font-sans min-w-[200px] flex flex-col gap-2 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[var(--on-surface)]">{data.date}</span>
          <span className="text-[10px] text-[var(--on-surface-muted)] font-mono">({data.name})</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] font-mono truncate max-w-[100px]">
          {data.colo}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--on-surface-muted)]">
            <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
            <span>Download</span>
          </div>
          <span className="font-bold text-[var(--on-surface)] tabular-nums">{data.download} Mbps</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--on-surface-muted)]">
            <span className="w-2 h-2 rounded-full bg-[#BF5AF2]" />
            <span>Upload</span>
          </div>
          <span className="font-medium text-[var(--on-surface)] tabular-nums">{data.upload} Mbps</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--on-surface-muted)]">
            <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
            <span>Latency</span>
          </div>
          <span className="font-bold text-[#FF9F0A] tabular-nums">{data.latency} ms</span>
        </div>

        {data.loss > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-rose-500">
            <span>Packet Loss</span>
            <span className="font-bold tabular-nums">{data.loss}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function HistoryPage() {
  const {
    records,
    loading,
    load,
    deleteRecord,
    deleteMultiple,
    updateRecord,
    importRecords,
    clearAll,
  } = useHistoryStore()
  const navigate = useNavigate()

  // State
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [comparePair, setComparePair] = useState<[MeasurementRecord, MeasurementRecord] | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Actions menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)

  // Professional Features State
  const [showTrendStrip, setShowTrendStrip] = useState(false)
  const [trendChartMode, setTrendChartMode] = useState<'all' | 'bandwidth' | 'latency'>('all')
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(20)
  const [taggingRecordId, setTaggingRecordId] = useState<string | null>(null)
  const [quickTagValue, setQuickTagValue] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    load()
  }, [load])

  // Close actions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false)
      }
    }
    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActionsMenu])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 2800)
  }

  // Summary Metrics Calculation
  const stats = useMemo(() => {
    if (records.length === 0) return null
    const dlValues = records.map((r) => r.downloadMbps).filter((v): v is number => v !== null)
    const ulValues = records.map((r) => r.uploadMbps).filter((v): v is number => v !== null)
    const latValues = records.map((r) => r.latencyMs).filter((v): v is number => v !== null)
    const jitterValues = records.map((r) => r.jitterMs).filter((v): v is number => v !== null)
    const lossValues = records.map((r) => r.lossPercent).filter((v): v is number => v !== null)

    const peakDl = dlValues.length ? Math.max(...dlValues) : 0
    const avgDl = dlValues.length ? dlValues.reduce((a, b) => a + b, 0) / dlValues.length : 0
    const peakUl = ulValues.length ? Math.max(...ulValues) : 0
    const medLat = median(latValues) ?? 0
    const medJitter = median(jitterValues) ?? 0
    const avgLoss = lossValues.length ? lossValues.reduce((a, b) => a + b, 0) / lossValues.length : 0

    const cleanRuns = records.filter(
      (r) => (r.lossPercent ?? 0) === 0 && (r.latencyMs ?? 0) < 150
    ).length
    const reliabilityScore = Math.round((cleanRuns / records.length) * 100)

    return {
      peakDl,
      avgDl,
      peakUl,
      medLat,
      medJitter,
      avgLoss,
      reliabilityScore,
    }
  }, [records])

  // Longitudinal Trend Data
  const trendData = useMemo(() => {
    if (records.length === 0) return []
    const chronological = [...records].reverse().slice(-30)
    return chronological.map((r, idx) => ({
      id: r.id,
      name: `#${idx + 1}`,
      date: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      download: r.downloadMbps !== null ? parseFloat(r.downloadMbps.toFixed(1)) : 0,
      upload: r.uploadMbps !== null ? parseFloat(r.uploadMbps.toFixed(1)) : 0,
      latency: r.latencyMs !== null ? parseFloat(r.latencyMs.toFixed(1)) : 0,
      jitter: r.jitterMs !== null ? parseFloat(r.jitterMs.toFixed(1)) : 0,
      loss: r.lossPercent !== null ? parseFloat(r.lossPercent.toFixed(1)) : 0,
      colo: r.colo || 'Edge',
    }))
  }, [records])

  const trendStats = useMemo(() => {
    if (trendData.length === 0) return null
    const dlVals = trendData.map((d) => d.download)
    const latVals = trendData.map((d) => d.latency)
    const peakDl = dlVals.length ? Math.max(...dlVals) : 0
    const medLat = median(latVals) ?? 0
    const cleanRuns = trendData.filter((d) => d.loss === 0 && d.latency < 100).length
    const stability = Math.round((cleanRuns / trendData.length) * 100)
    return { peakDl, medLat, stability }
  }, [trendData])

  // Filter & Sort Logic
  const filteredRecords = useMemo(() => {
    let result = [...records]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          (r.colo && r.colo.toLowerCase().includes(q)) ||
          (r.endpointUrl && r.endpointUrl.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          (r.tags && r.tags.some((t) => t.toLowerCase().includes(q))) ||
          new Date(r.timestamp).toLocaleDateString().toLowerCase().includes(q)
      )
    }

    if (filterMode === 'fast') {
      result = result.filter((r) => (r.downloadMbps ?? 0) >= 15)
    } else if (filterMode === 'high_latency') {
      result = result.filter((r) => (r.latencyMs ?? 0) >= 100)
    } else if (filterMode === 'packet_loss') {
      result = result.filter((r) => (r.lossPercent ?? 0) > 0)
    } else if (filterMode === 'geotagged') {
      result = result.filter((r) => Boolean(r.location))
    }

    if (sortMode === 'newest') {
      result.sort((a, b) => b.timestamp - a.timestamp)
    } else if (sortMode === 'oldest') {
      result.sort((a, b) => a.timestamp - b.timestamp)
    } else if (sortMode === 'fastest_dl') {
      result.sort((a, b) => (b.downloadMbps ?? 0) - (a.downloadMbps ?? 0))
    } else if (sortMode === 'lowest_latency') {
      result.sort((a, b) => (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999))
    }

    return result
  }, [records, searchQuery, filterMode, sortMode])

  // Grouped by Date Timeline
  const groupedRecords = useMemo(() => {
    const groups: {
      title: string
      records: MeasurementRecord[]
      avgDl: number
      medPing: number
    }[] = []
    const groupMap = new Map<string, MeasurementRecord[]>()

    for (const rec of filteredRecords) {
      const grp = getDateGroupTitle(rec.timestamp)
      if (!groupMap.has(grp)) {
        groupMap.set(grp, [])
      }
      groupMap.get(grp)!.push(rec)
    }

    for (const [title, recs] of groupMap.entries()) {
      const dlVals = recs.map((r) => r.downloadMbps).filter((v): v is number => v !== null)
      const latVals = recs.map((r) => r.latencyMs).filter((v): v is number => v !== null)
      const avgDl = dlVals.length ? dlVals.reduce((a, b) => a + b, 0) / dlVals.length : 0
      const medPing = median(latVals) ?? 0
      groups.push({ title, records: recs, avgDl, medPing })
    }

    return groups
  }, [filteredRecords])

  const displayedCount = Math.min(visibleLimit, filteredRecords.length)

  // Selection handlers
  const toggleSelectRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRecords.map((r) => r.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    const count = selectedIds.length
    await deleteMultiple(selectedIds)
    setSelectedIds([])
    showToast(`Deleted ${count} record${count > 1 ? 's' : ''}`)
  }

  const handleTriggerCompare = () => {
    if (selectedIds.length !== 2) return
    const rec1 = records.find((r) => r.id === selectedIds[0])
    const rec2 = records.find((r) => r.id === selectedIds[1])
    if (rec1 && rec2) {
      setComparePair([rec1, rec2])
    }
  }

  // Quick Copy
  const handleCopyRecord = (rec: MeasurementRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const text = generateShareSummary(rec)
    navigator.clipboard.writeText(text)
    setCopiedId(rec.id)
    showToast('Summary copied to clipboard')
    setTimeout(() => {
      setCopiedId((cur) => (cur === rec.id ? null : cur))
    }, 2000)
  }

  // Single Delete
  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await deleteRecord(id)
    setDeleteTargetId(null)
    setSelectedIds((prev) => prev.filter((item) => item !== id))
    showToast('Measurement deleted')
  }

  // Inline Quick Tagging
  const handleSaveQuickTag = async (rec: MeasurementRecord, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const trimmed = quickTagValue.trim()
    if (!trimmed) {
      setTaggingRecordId(null)
      return
    }
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    const existingTags = rec.tags || []
    if (!existingTags.includes(formatted)) {
      const updatedTags = [...existingTags, formatted]
      await updateRecord(rec.id, { tags: updatedTags })
      showToast(`Tag added`)
    }
    setQuickTagValue('')
    setTaggingRecordId(null)
  }

  const handleRemoveTag = async (rec: MeasurementRecord, tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const updatedTags = (rec.tags || []).filter((t) => t !== tagToRemove)
    await updateRecord(rec.id, { tags: updatedTags })
    showToast(`Tag removed`)
  }

  // Exports
  const handleExportCsv = () => {
    const dataToExport = selectedIds.length > 0
      ? records.filter((r) => selectedIds.includes(r.id))
      : filteredRecords
    const csvStr = exportToCsv(dataToExport)
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nexis-telemetry-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Exported ${dataToExport.length} records to CSV`)
    setShowActionsMenu(false)
  }

  const handleExportJson = () => {
    const dataToExport = selectedIds.length > 0
      ? records.filter((r) => selectedIds.includes(r.id))
      : filteredRecords
    const jsonStr = exportToJson(dataToExport)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nexis-telemetry-backup-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Exported ${dataToExport.length} records to JSON`)
    setShowActionsMenu(false)
  }

  // Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string
        const parsed = parseImportJson(text)
        if (parsed.length === 0) {
          showToast('No valid measurement records found in file')
          return
        }
        const count = await importRecords(parsed)
        showToast(`Imported ${count} records`)
      } catch (err) {
        showToast(`Import error: ${err instanceof Error ? err.message : 'Invalid file'}`)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
        setShowActionsMenu(false)
      }
    }
    reader.readAsText(file)
  }

  let runningCount = 0

  return (
    <div className="w-full flex flex-col gap-6 max-w-[1440px] 2xl:max-w-[1560px] mx-auto p-4 sm:p-6 lg:p-8 select-none relative pb-16">
      {/* Toast Notification - Apple Dynamic Island style */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-surface)] text-[var(--on-surface)] border border-[var(--border-subtle)] shadow-[0_12px_32px_rgba(0,0,0,0.15)] backdrop-blur-2xl text-xs font-sans font-medium animate-in fade-in slide-in-from-bottom-2">
          <IoCheckmarkCircle className="text-sm text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* ── Top Header & Action Toolbar (Clean Apple Design) ───────────────── */}
      <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase text-[var(--primary)]">
            <span>TELEMETRY ARCHIVE</span>
            <span className="text-[var(--on-surface-dim)]">/</span>
            <span className="text-[var(--on-surface-muted)]">LOCAL BENCHMARKS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-[var(--on-surface)] mt-1">
            Measurement History
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-0.5">
            Cryptographically sealed client-side records persisted in IndexedDB.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {records.length > 0 && (
            <>
              {/* Select Mode Toggle */}
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode)
                  if (isSelectMode) setSelectedIds([])
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-full border transition-all cursor-pointer active:scale-95 ${
                  isSelectMode
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <IoCheckmarkCircleOutline className="text-sm" />
                <span>{isSelectMode ? 'Cancel' : 'Select'}</span>
              </button>

              {/* Executive Audit Report Button */}
              <button
                onClick={() => setShowAuditModal(true)}
                title="Generate diagnostic compliance report"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <IoDocumentTextOutline className="text-sm text-[var(--primary)]" />
                <span>Audit Report</span>
              </button>

              {/* More Actions Dropdown Menu */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  title="More archive actions"
                  className="p-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-xs"
                >
                  <IoEllipsisHorizontal className="text-sm" />
                </button>

                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl backdrop-blur-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in">
                    <button
                      onClick={handleExportCsv}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all w-full text-left cursor-pointer"
                    >
                      <IoDownloadOutline className="text-sm text-[var(--primary)]" />
                      <span>Export as CSV</span>
                    </button>
                    <button
                      onClick={handleExportJson}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all w-full text-left cursor-pointer"
                    >
                      <IoDownloadOutline className="text-sm text-[var(--color-purple)]" />
                      <span>Export as JSON</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all w-full text-left cursor-pointer"
                    >
                      <IoCloudUploadOutline className="text-sm text-[var(--color-success)]" />
                      <span>Import JSON Backup</span>
                    </button>
                    <div className="my-1 border-t border-[var(--border-subtle)]" />
                    {!confirmClear ? (
                      <button
                        onClick={() => setConfirmClear(true)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-xl transition-all w-full text-left cursor-pointer"
                      >
                        <IoTrashOutline className="text-sm" />
                        <span>Wipe All Records...</span>
                      </button>
                    ) : (
                      <div className="p-2 flex flex-col gap-1.5 bg-[var(--color-danger)]/10 rounded-xl border border-[var(--color-danger)]/20">
                        <span className="text-[11px] font-sans text-[var(--color-danger)] font-medium">Permanently wipe?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              await clearAll()
                              setConfirmClear(false)
                              setShowActionsMenu(false)
                              setSelectedIds([])
                              showToast('All records wiped')
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-[var(--color-danger)] text-white rounded-md cursor-pointer active:scale-95"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmClear(false)}
                            className="px-2 py-1 text-[11px] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Shimmer Skeleton Loading State ─────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
          </div>
          <div className="h-11 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary KPI Cards (Clean Apple SF Pro Metrics Strip) ─────────── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Total Runs */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
                    TOTAL RUNS
                  </span>
                  <IoLayersOutline className="text-xs text-[var(--on-surface-muted)]" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                    {records.length}
                  </span>
                  <span className="text-[11px] font-sans text-[var(--on-surface-muted)] block mt-0.5">
                    Sessions recorded
                  </span>
                </div>
              </div>

              {/* Peak Download */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
                    PEAK DOWNLOAD
                  </span>
                  <IoArrowDownOutline className="text-xs text-[var(--primary)]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                      {formatMbps(stats.peakDl).split(' ')[0]}
                    </span>
                    <span className="text-xs font-sans text-[var(--on-surface-muted)]">Mbps</span>
                  </div>
                  <span className="text-[11px] font-sans text-[var(--on-surface-muted)] block mt-0.5">
                    Avg {stats.avgDl.toFixed(1)} Mbps
                  </span>
                </div>
              </div>

              {/* Peak Upload */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
                    PEAK UPLOAD
                  </span>
                  <IoArrowUpOutline className="text-xs text-[var(--color-purple)]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                      {formatMbps(stats.peakUl).split(' ')[0]}
                    </span>
                    <span className="text-xs font-sans text-[var(--on-surface-muted)]">Mbps</span>
                  </div>
                  <span className="text-[11px] font-sans text-[var(--on-surface-muted)] block mt-0.5">
                    Burst uplink
                  </span>
                </div>
              </div>

              {/* Median Ping */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
                    MEDIAN PING
                  </span>
                  <IoSpeedometerOutline className="text-xs text-[var(--color-warning)]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                      {formatMs(stats.medLat).split(' ')[0]}
                    </span>
                    <span className="text-xs font-sans text-[var(--on-surface-muted)]">ms</span>
                  </div>
                  <span className="text-[11px] font-sans text-[var(--on-surface-muted)] block mt-0.5">
                    Jitter ~{stats.medJitter.toFixed(1)}ms
                  </span>
                </div>
              </div>

              {/* Reliability / Loss */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl flex flex-col justify-between col-span-2 lg:col-span-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-muted)] font-semibold">
                    SLA GRADE
                  </span>
                  <IoCheckmarkCircle className="text-xs text-[var(--color-success)]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-sans text-[var(--on-surface)] tracking-tight">
                      {stats.reliabilityScore}%
                    </span>
                  </div>
                  <span className="text-[11px] font-sans text-[var(--on-surface-muted)] block mt-0.5">
                    Loss {stats.avgLoss.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Collapsible Longitudinal Trend Chart ─────────────────────────── */}
          {records.length > 1 && (
            <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl overflow-hidden transition-all shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 select-none border-b border-[var(--border-subtle)]">
                {/* Left: Title & Window summary chips */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowTrendStrip(!showTrendStrip)}
                    className="flex items-center gap-2 text-xs font-sans text-[var(--on-surface)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                  >
                    <IoStatsChartOutline className="text-sm text-[var(--primary)]" />
                    <span className="font-semibold">Performance Stability Curve</span>
                    <span className="text-[var(--on-surface-muted)]">• Last {trendData.length} benchmarks</span>
                    {showTrendStrip ? <IoChevronUp className="text-[var(--on-surface-muted)]" /> : <IoChevronDown className="text-[var(--on-surface-muted)]" />}
                  </button>

                  {showTrendStrip && trendStats && (
                    <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono pl-3 border-l border-[var(--border-subtle)]">
                      <span className="text-[var(--on-surface-muted)]">
                        Peak: <strong className="text-[var(--primary)] font-semibold">{trendStats.peakDl.toFixed(1)} Mbps</strong>
                      </span>
                      <span className="text-[var(--on-surface-dim)]">·</span>
                      <span className="text-[var(--on-surface-muted)]">
                        Med Ping: <strong className="text-[var(--color-warning)] font-semibold">{trendStats.medLat.toFixed(0)} ms</strong>
                      </span>
                      <span className="text-[var(--on-surface-dim)]">·</span>
                      <span className="text-[var(--on-surface-muted)]">
                        Stability: <strong className="text-[var(--color-success)] font-semibold">{trendStats.stability}%</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: View Mode Toggle Pills (when open) */}
                {showTrendStrip && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="p-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center gap-0.5 text-[11px] font-sans">
                      <button
                        onClick={() => setTrendChartMode('all')}
                        className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                          trendChartMode === 'all'
                            ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                            : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                        }`}
                      >
                        Dual-Axis
                      </button>
                      <button
                        onClick={() => setTrendChartMode('bandwidth')}
                        className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                          trendChartMode === 'bandwidth'
                            ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                            : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                        }`}
                      >
                        Throughput
                      </button>
                      <button
                        onClick={() => setTrendChartMode('latency')}
                        className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                          trendChartMode === 'latency'
                            ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                            : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                        }`}
                      >
                        Latency
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {showTrendStrip && (
                <div className="p-4 pt-3 h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {trendChartMode === 'bandwidth' ? (
                      <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dlArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ulArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#BF5AF2" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#BF5AF2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" stroke="#636366" fontSize={10} tickLine={false} />
                        <YAxis stroke="#636366" fontSize={10} tickLine={false} unit="M" />
                        <Tooltip content={<CustomTrendTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="download"
                          name="Download"
                          stroke="#0A84FF"
                          strokeWidth={2}
                          fill="url(#dlArea)"
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="upload"
                          name="Upload"
                          stroke="#BF5AF2"
                          strokeWidth={1.5}
                          fill="url(#ulArea)"
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : trendChartMode === 'latency' ? (
                      <LineChart data={trendData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" stroke="#636366" fontSize={10} tickLine={false} />
                        <YAxis stroke="#636366" fontSize={10} tickLine={false} unit="ms" />
                        <ReferenceLine
                          y={50}
                          stroke="rgba(255,255,255,0.15)"
                          strokeDasharray="4 4"
                          label={{ value: '50ms Target', fill: '#8E8E93', fontSize: 10, position: 'insideBottomRight' }}
                        />
                        <Tooltip content={<CustomTrendTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="latency"
                          name="Ping"
                          stroke="#FF9F0A"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="jitter"
                          name="Jitter"
                          stroke="#30D158"
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                      </LineChart>
                    ) : (
                      /* Dual-Axis: Left for Mbps, Right for Latency (ms) */
                      <LineChart data={trendData} margin={{ top: 8, right: -10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" stroke="#636366" fontSize={10} tickLine={false} />
                        <YAxis
                          yAxisId="left"
                          stroke="#0A84FF"
                          fontSize={10}
                          tickLine={false}
                          unit="M"
                          domain={[0, 'auto']}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#FF9F0A"
                          fontSize={10}
                          tickLine={false}
                          unit="ms"
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<CustomTrendTooltip />} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="download"
                          name="Download"
                          stroke="#0A84FF"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="upload"
                          name="Upload"
                          stroke="#BF5AF2"
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="latency"
                          name="Ping"
                          stroke="#FF9F0A"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Search & Apple iOS Filter Bar ─────────────────────────────────── */}
          {records.length > 0 && (
            <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-xl shadow-xs">
              {/* Search Box */}
              <div className="flex items-center h-9 gap-2 flex-1 max-w-sm px-3 rounded-full bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] focus-within:border-[var(--primary)] transition-colors">
                <IoSearchOutline className="text-[var(--on-surface-muted)] text-sm shrink-0" />
                <input
                  type="text"
                  placeholder="Search node, tag, note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-sans bg-transparent outline-none text-[var(--on-surface)] placeholder:text-[var(--on-surface-muted)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] cursor-pointer"
                  >
                    <IoCloseOutline className="text-sm" />
                  </button>
                )}
              </div>

              {/* Segmented Filter Control */}
              <div className="h-9 p-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center gap-0.5 overflow-x-auto">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`h-full px-3 rounded-full text-xs font-sans flex items-center transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === 'all'
                      ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  All ({records.length})
                </button>
                <button
                  onClick={() => setFilterMode('fast')}
                  className={`h-full px-3 rounded-full text-xs font-sans flex items-center transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === 'fast'
                      ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  Fast (≥15M)
                </button>
                <button
                  onClick={() => setFilterMode('high_latency')}
                  className={`h-full px-3 rounded-full text-xs font-sans flex items-center transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === 'high_latency'
                      ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  Laggy (≥100ms)
                </button>
                <button
                  onClick={() => setFilterMode('packet_loss')}
                  className={`h-full px-3 rounded-full text-xs font-sans flex items-center transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === 'packet_loss'
                      ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  Loss
                </button>
                <button
                  onClick={() => setFilterMode('geotagged')}
                  className={`h-full px-3 rounded-full text-xs font-sans flex items-center transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === 'geotagged'
                      ? 'bg-[var(--bg-surface)] text-[var(--on-surface)] font-medium shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  GPS
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center self-end md:self-auto">
                <NexisDropdown
                  options={SORT_OPTIONS}
                  value={sortMode}
                  onChange={(val) => setSortMode(val)}
                  labelPrefix="Sort:"
                  menuWidth={210}
                  align="right"
                />
              </div>
            </div>
          )}

          {/* ── Empty States ─────────────────────────────────────────────────── */}
          {records.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center flex flex-col items-center justify-center gap-3 backdrop-blur-xl">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--primary)] bg-[var(--primary)]/10">
                <IoPulseOutline className="text-xl" />
              </div>
              <p className="font-semibold font-sans text-sm text-[var(--on-surface)]">
                No measurements recorded yet
              </p>
              <p className="text-xs font-sans max-w-xs text-[var(--on-surface-muted)]">
                Run a speed benchmark from the Connection Cockpit to populate your diagnostic history.
              </p>
              <Link
                to="/"
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-sans font-semibold bg-[var(--primary)] text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <IoPlayOutline className="text-sm" />
                <span>Start Benchmark</span>
              </Link>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center flex flex-col items-center justify-center gap-2 backdrop-blur-xl">
              <p className="font-semibold font-sans text-xs text-[var(--on-surface)]">
                No measurements match current filter
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterMode('all')
                }}
                className="mt-1 px-3.5 py-1 text-xs font-sans font-medium text-[var(--primary)] border border-[var(--border-subtle)] rounded-full hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* ── Measurement List Grouped by Timeline (Clean Inset Grouped) ── */
            <div className="flex flex-col gap-6">
              {groupedRecords.map((group) => {
                const groupVisibleItems = group.records.filter(() => {
                  if (runningCount < visibleLimit) {
                    runningCount++
                    return true
                  }
                  return false
                })

                if (groupVisibleItems.length === 0) return null

                return (
                  <div key={group.title} className="flex flex-col gap-2">
                    {/* Section Header */}
                    <div className="flex items-center justify-between px-4 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <IoCalendarOutline className="text-xs text-[var(--on-surface-dim)]" />
                        <span className="font-bold uppercase tracking-wider text-[11px] text-[var(--on-surface-muted)]">
                          {group.title}
                        </span>
                        <span className="text-[11px] text-[var(--on-surface-dim)]">
                          ({group.records.length})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--on-surface-muted)]">
                        Avg: <strong className="text-[var(--on-surface)]">{formatMbps(group.avgDl)}</strong> · Ping: <strong className="text-[var(--on-surface)]">{formatMs(group.medPing)}</strong>
                      </div>
                    </div>

                    {/* Inset Rows List */}
                    <div className="flex flex-col gap-1.5">
                      {groupVisibleItems.map((rec) => {
                        const quality = qualityFromRecord(rec)
                        const qualityLabel = getQualityLabel(quality, rec.lossPercent)

                        const timeStr = new Date(rec.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        const dateStr = new Date(rec.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })
                        const relTime = formatRelativeTime(rec.timestamp)
                        const isSelected = selectedIds.includes(rec.id)
                        const hasLoss = (rec.lossPercent ?? 0) > 0

                        return (
                          <div
                            key={rec.id}
                            onClick={() => {
                              if (isSelectMode) {
                                setSelectedIds((prev) =>
                                  prev.includes(rec.id) ? prev.filter((id) => id !== rec.id) : [...prev, rec.id]
                                )
                              } else {
                                navigate(`/history/${rec.id}`)
                              }
                            }}
                            className={`group flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-all cursor-pointer backdrop-blur-xl shadow-xs ${
                              isSelected
                                ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/60 ring-1 ring-[var(--primary)]/40'
                                : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/70'
                            }`}
                          >
                            {/* Column 1: Status Dot & Core Info (flexible) */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Selection Checkbox */}
                              {isSelectMode && (
                                <button
                                  onClick={(e) => toggleSelectRecord(rec.id, e)}
                                  className="text-[var(--primary)] shrink-0 cursor-pointer"
                                >
                                  {isSelected ? (
                                    <IoCheckmarkCircle className="text-lg" />
                                  ) : (
                                    <IoCheckmarkCircleOutline className="text-lg text-[var(--on-surface-dim)]" />
                                  )}
                                </button>
                              )}

                              {/* Status Indicator Dot */}
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: qualityColor(quality) }}
                                title={qualityLabel}
                              />

                              {/* Date & Node Info */}
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold font-sans text-[var(--on-surface)] tabular-nums">
                                    {dateStr} · {timeStr}
                                  </span>
                                  <span className="text-[11px] font-sans text-[var(--on-surface-muted)]">
                                    {relTime}
                                  </span>
                                  {rec.location && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-sans text-[var(--on-surface-muted)]">
                                      <IoLocationOutline className="text-[11px] text-[var(--primary)]" />
                                      <span>GPS</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-sans text-[var(--on-surface-muted)] truncate mt-0.5">
                                  <span className="truncate max-w-[140px] sm:max-w-[200px] text-[var(--on-surface)] font-medium">{rec.isp ? rec.isp : (rec.colo || 'Cloudflare Edge')}</span>
                                  <span>•</span>
                                  <span className="tabular-nums">{formatMs(rec.latencyMs)} ping</span>
                                  {hasLoss && (
                                    <>
                                      <span>•</span>
                                      <span className="text-rose-500 font-semibold tabular-nums">
                                        {rec.lossPercent?.toFixed(1)}% loss
                                      </span>
                                    </>
                                  )}
                                  {rec.tags && rec.tags.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-[var(--on-surface-dim)] truncate max-w-[120px]">
                                        {rec.tags.join(' ')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Fixed-width Throughput Speeds (tabular alignment) */}
                            <div className="w-24 sm:w-28 text-right shrink-0">
                              <div className="flex items-baseline justify-end gap-1 font-mono">
                                <span className="text-sm font-bold text-[var(--on-surface)] tabular-nums">
                                  {rec.downloadMbps !== null ? rec.downloadMbps.toFixed(1) : '—'}
                                </span>
                                <span className="text-[11px] font-sans text-[var(--on-surface-muted)]">Mbps</span>
                              </div>
                              <div className="text-[11px] font-mono text-[var(--on-surface-muted)] text-right tabular-nums">
                                ↑ {rec.uploadMbps !== null ? rec.uploadMbps.toFixed(1) : '—'}
                              </div>
                            </div>

                            {/* Column 3: Fixed-width Quality Pill Track (centered) */}
                            <div className="hidden sm:flex w-28 items-center justify-center shrink-0">
                              <span
                                className="w-full text-center py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full border truncate"
                                style={{
                                  backgroundColor: `${qualityColor(quality)}15`,
                                  borderColor: `${qualityColor(quality)}30`,
                                  color: qualityColor(quality),
                                }}
                              >
                                {qualityLabel}
                              </span>
                            </div>

                            {/* Column 4: Fixed-width Action Buttons & Chevron Track */}
                            <div className="w-16 sm:w-20 flex items-center justify-end gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleCopyRecord(rec, e)}
                                title="Copy summary"
                                className="p-1.5 rounded-lg text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                              >
                                {copiedId === rec.id ? (
                                  <IoCheckmarkOutline className="text-sm text-emerald-500" />
                                ) : (
                                  <IoCopyOutline className="text-sm" />
                                )}
                              </button>

                              {deleteTargetId !== rec.id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setDeleteTargetId(rec.id)
                                  }}
                                  title="Delete"
                                  className="p-1.5 rounded-lg text-[var(--on-surface-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <IoTrashOutline className="text-sm" />
                                </button>
                              ) : (
                                <div
                                  className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-md border border-rose-500/40 shadow-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => handleDeleteSingle(rec.id, e)}
                                    className="px-2 py-0.5 text-[10px] font-sans font-semibold bg-rose-500 text-white rounded cursor-pointer"
                                  >
                                    Del
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteTargetId(null)
                                    }}
                                    className="p-0.5 text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] cursor-pointer"
                                    title="Cancel"
                                  >
                                    <IoCloseOutline className="text-xs" />
                                  </button>
                                </div>
                              )}

                              <IoChevronForward className="text-sm text-[var(--on-surface-dim)] group-hover:text-[var(--on-surface)] transition-colors ml-0.5" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {filteredRecords.length > visibleLimit && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-sans mt-2">
                  <span className="text-[var(--on-surface-muted)]">
                    Showing <strong className="text-[var(--on-surface)]">{displayedCount}</strong> of{' '}
                    <strong className="text-[var(--on-surface)]">{filteredRecords.length}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVisibleLimit((prev) => prev + 20)}
                      className="px-3.5 py-1.5 rounded-full font-medium bg-[var(--primary)] text-white text-xs cursor-pointer active:scale-95"
                    >
                      Load More
                    </button>
                    <button
                      onClick={() => setVisibleLimit(filteredRecords.length)}
                      className="px-3 py-1.5 rounded-full font-medium border border-[var(--border-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] text-xs cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Selection Floating Action Island (Apple Dynamic Island) ───────── */}
      {isSelectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--bg-surface)] text-[var(--on-surface)] border border-[var(--border-subtle)] shadow-[0_16px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl text-xs font-sans animate-in slide-in-from-bottom-3">
          <button
            onClick={handleSelectAll}
            className="text-xs font-sans font-medium text-[var(--primary)] cursor-pointer"
          >
            {selectedIds.length === filteredRecords.length ? 'Deselect All' : 'Select All'}
          </button>

          <span className="text-[var(--border-subtle)]">|</span>

          <span className="text-[var(--on-surface)] font-medium">
            {selectedIds.length} selected
          </span>

          <div className="flex items-center gap-2 ml-1">
            <button
              disabled={selectedIds.length !== 2}
              onClick={handleTriggerCompare}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedIds.length === 2
                  ? 'bg-[var(--primary)] text-white shadow-xs active:scale-95'
                  : 'bg-[var(--bg-subtle)] text-[var(--on-surface-dim)] cursor-not-allowed'
              }`}
            >
              <IoGitCompareOutline className="text-xs" />
              <span>Compare (2)</span>
            </button>

            <button
              disabled={selectedIds.length === 0}
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-rose-500 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <IoTrashOutline className="text-xs" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => {
                setIsSelectMode(false)
                setSelectedIds([])
              }}
              className="p-1 rounded-full text-[var(--on-surface-dim)] hover:text-[var(--on-surface)] cursor-pointer ml-0.5"
            >
              <IoCloseOutline className="text-sm" />
            </button>
          </div>
        </div>
      )}

      {/* ── Executive Audit Report Modal ─────────────────────────────────── */}
      {showAuditModal && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[0_24px_60px_rgba(0,0,0,0.3)] text-[var(--on-surface)] flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <IoDocumentTextOutline className="text-lg text-[var(--primary)]" />
                <h3 className="text-base font-bold font-sans">Executive Network Performance Audit</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold bg-[var(--primary)] text-white shadow-xs cursor-pointer active:scale-95"
                >
                  <IoPrintOutline className="text-sm" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-1 rounded-full text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] cursor-pointer"
                >
                  <IoCloseOutline className="text-lg" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--primary)]">
                NEXIS TELEMETRY AUDIT CERTIFICATE
              </span>
              <h2 className="text-lg font-bold font-sans">
                Broadband Reliability &amp; SLA Diagnostic Record
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1 text-xs font-mono pt-3 border-t border-[var(--border-subtle)]">
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[10px]">TOTAL TESTS</span>
                  <span className="font-bold text-[var(--on-surface)]">{records.length} runs</span>
                </div>
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[10px]">PEAK DOWNLOAD</span>
                  <span className="font-bold text-[var(--primary)]">{formatMbps(stats.peakDl)}</span>
                </div>
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[10px]">MEDIAN LATENCY</span>
                  <span className="font-bold text-amber-500">{formatMs(stats.medLat)}</span>
                </div>
                <div>
                  <span className="text-[var(--on-surface-dim)] block text-[10px]">SLA COMPLIANCE</span>
                  <span className="font-bold text-emerald-500">{stats.reliabilityScore}%</span>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden text-xs font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] text-[var(--on-surface-muted)] text-[11px]">
                    <th className="p-2.5 pl-3">TIMESTAMP</th>
                    <th className="p-2.5">DOWNLOAD</th>
                    <th className="p-2.5">UPLOAD</th>
                    <th className="p-2.5">PING</th>
                    <th className="p-2.5">LOSS</th>
                    <th className="p-2.5 pr-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {records.slice(0, 15).map((r) => {
                    const q = qualityFromRecord(r)
                    return (
                      <tr key={r.id} className="hover:bg-[var(--bg-subtle)]/50">
                        <td className="p-2.5 pl-3 text-[var(--on-surface)] font-mono text-[11px]">
                          {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[var(--primary)]">
                          {formatMbps(r.downloadMbps)}
                        </td>
                        <td className="p-2.5 font-mono text-[var(--on-surface-muted)]">
                          {formatMbps(r.uploadMbps)}
                        </td>
                        <td className="p-2.5 font-mono text-[var(--on-surface-muted)]">
                          {formatMs(r.latencyMs)}
                        </td>
                        <td className="p-2.5 font-mono">
                          {r.lossPercent ? `${r.lossPercent.toFixed(1)}%` : '0%'}
                        </td>
                        <td className="p-2.5 pr-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                            style={{ backgroundColor: `${qualityColor(q)}15`, color: qualityColor(q) }}
                          >
                            {getQualityLabel(q, r.lossPercent)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 rounded-full text-xs font-sans font-semibold bg-[var(--bg-subtle)] text-[var(--on-surface)] hover:bg-[var(--border-subtle)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── A/B Comparison Modal ─────────────────────────────────────────── */}
      {comparePair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[0_24px_60px_rgba(0,0,0,0.3)] text-[var(--on-surface)] flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <IoGitCompareOutline className="text-base text-[var(--primary)]" />
                <h3 className="text-base font-bold font-sans">A/B Session Benchmark Comparison</h3>
              </div>
              <button
                onClick={() => setComparePair(null)}
                className="p-1 rounded-full text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] cursor-pointer"
              >
                <IoCloseOutline className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono text-[var(--primary)] font-bold uppercase block">RUN A</span>
                <span className="font-semibold text-[var(--on-surface)] block mt-0.5">{new Date(comparePair[0].timestamp).toLocaleString()}</span>
                <span className="text-[var(--on-surface-muted)] text-[11px]">{comparePair[0].colo || 'Edge'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono text-purple-500 font-bold uppercase block">RUN B</span>
                <span className="font-semibold text-[var(--on-surface)] block mt-0.5">{new Date(comparePair[1].timestamp).toLocaleString()}</span>
                <span className="text-[var(--on-surface-muted)] text-[11px]">{comparePair[1].colo || 'Edge'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs font-sans">
              {/* Download */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--on-surface-muted)]">Download Speed</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-bold text-[var(--primary)]">{formatMbps(comparePair[0].downloadMbps)}</span>
                  <span className="text-[var(--on-surface-dim)]">→</span>
                  <span className="font-bold text-[var(--primary)]">{formatMbps(comparePair[1].downloadMbps)}</span>
                  {comparePair[0].downloadMbps && comparePair[1].downloadMbps && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        comparePair[1].downloadMbps >= comparePair[0].downloadMbps
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {(comparePair[1].downloadMbps - comparePair[0].downloadMbps).toFixed(1)} Mbps
                    </span>
                  )}
                </div>
              </div>

              {/* Upload */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--on-surface-muted)]">Upload Speed</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-bold text-purple-500">{formatMbps(comparePair[0].uploadMbps)}</span>
                  <span className="text-[var(--on-surface-dim)]">→</span>
                  <span className="font-bold text-purple-500">{formatMbps(comparePair[1].uploadMbps)}</span>
                </div>
              </div>

              {/* Ping */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--on-surface-muted)]">Round-Trip Latency</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-bold text-amber-500">{formatMs(comparePair[0].latencyMs)}</span>
                  <span className="text-[var(--on-surface-dim)]">→</span>
                  <span className="font-bold text-amber-500">{formatMs(comparePair[1].latencyMs)}</span>
                  {comparePair[0].latencyMs !== null && comparePair[1].latencyMs !== null && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        comparePair[1].latencyMs <= comparePair[0].latencyMs
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {(comparePair[1].latencyMs - comparePair[0].latencyMs).toFixed(0)} ms
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setComparePair(null)}
                className="px-4 py-1.5 rounded-full text-xs font-sans font-semibold bg-[var(--bg-subtle)] text-[var(--on-surface)] hover:bg-[var(--border-subtle)] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

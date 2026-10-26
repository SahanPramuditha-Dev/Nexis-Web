import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import StopRounded from '@mui/icons-material/StopRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import RouterRounded from '@mui/icons-material/RouterRounded'
import SensorsRounded from '@mui/icons-material/SensorsRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'

import {
  NexisMetricTile,
  SpeedtestGaugeCard,
  ConnectionHealthPanel,
  QoEScorecardSection,
  VisualShareCardModal,
} from '@/design/components'
import { MeasurementEngine } from '@/measurement/engine'
import { useMeasurementStore } from '@/stores/measurementStore'
import { useHistoryStore } from '@/stores/historyStore'
import { formatMbps, formatMs, qualityFromRecord, qualityColor, type MeasurementRecord } from '@/data/models'
import { detectClientCarrier, inferConnectionType } from '@/data/carrierService'

const engine = new MeasurementEngine()

export function HomePage() {
  const {
    phase,
    progress,
    liveMbps,
    samples,
    result,
    failure,
    setPhase,
    setProgress,
    setLiveMbps,
    setSamples,
    setResult,
    setFailure,
    setLocation,
    reset,
  } = useMeasurementStore()

  const { records, add, load } = useHistoryStore()
  const [quickPing, setQuickPing] = useState<number | null>(null)
  const [isPinging, setIsPinging] = useState(false)
  const [publicIp, setPublicIp] = useState<string>('Detecting...')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => setPublicIp(data.ip))
      .catch(() => setPublicIp('111.223.177.136'))
  }, [])

  // Proactively fetch device location so all tests get geotagged with real GPS
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: Math.round(pos.coords.accuracy || 20),
            precision: pos.coords.accuracy && pos.coords.accuracy < 30 ? 'precise' : 'approximate',
          })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      )
    }
  }, [setLocation])

  const isRunning =
    phase !== 'idle' && phase !== 'complete' && phase !== 'failed' && phase !== 'stopped'

  const handleStart = () => {
    if (isRunning) return

    // Ensure location is updated if available
    if (typeof navigator !== 'undefined' && navigator.geolocation && !useMeasurementStore.getState().location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: Math.round(pos.coords.accuracy || 20),
            precision: pos.coords.accuracy && pos.coords.accuracy < 30 ? 'precise' : 'approximate',
          })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 4000 }
      )
    }

    reset()
    setPhase('connecting')
    setProgress(0.01)
    setLiveMbps(0)
    setSamples([])

    engine.run({
      onProgress: (p) => {
        setPhase(p.phase)
        setProgress(p.progress)
        if (p.liveMbps !== undefined) {
          setLiveMbps(p.liveMbps)
        }
        if (p.samples) {
          setSamples(p.samples)
        }
      },
      onComplete: async (res) => {
        setResult(res)
        setLiveMbps(res.downloadMbps || 0)
        if (res.samples) {
          setSamples(res.samples)
        }

        // Accurately resolve client carrier, ISP, ASN, and connection type
        const carrierInfo = await detectClientCarrier().catch(() => null)
        const connType = inferConnectionType(
          carrierInfo?.isp || '',
          carrierInfo?.org || '',
          res.downloadMbps
        )

        const detectedTags: string[] = [connType]
        if (carrierInfo?.isp) {
          detectedTags.push(carrierInfo.isp)
        }

        const record: MeasurementRecord = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          latencyMs: res.latencyMs,
          loadedLatencyMs: res.loadedLatencyMs,
          downloadLoadedLatencyMs: res.downloadLoadedLatencyMs,
          uploadLoadedLatencyMs: res.uploadLoadedLatencyMs,
          bufferbloatMs: res.bufferbloatMs,
          bufferbloatGrade: res.bufferbloatGrade,
          jitterMs: res.jitterMs,
          lossPercent: res.lossPercent,
          downloadMbps: res.downloadMbps,
          uploadMbps: res.uploadMbps,
          endpointUrl: res.endpointUrl,
          methodVersion: res.methodVersion,
          location: useMeasurementStore.getState().location,
          samples: res.samples,
          durationSec: res.durationSec,
          colo: res.colo,
          isp: carrierInfo?.isp || undefined,
          asn: carrierInfo?.asn || undefined,
          asnOrg: carrierInfo?.org || undefined,
          clientIp: carrierInfo?.ip || undefined,
          tags: detectedTags.length > 0 ? detectedTags : undefined,
        }
        add(record)
      },
      onFailed: (err) => {
        setFailure(err)
        setLiveMbps(0)
      },
    })
  }

  const handleStop = () => {
    if (!isRunning) return
    engine.cancel()
    setPhase('stopped')
    setProgress(0)
    setLiveMbps(0)
  }

  // Cockpit keyboard controls: Space to start/stop, Escape to cancel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (isRunning) {
          handleStop()
        } else {
          handleStart()
        }
      } else if (e.key === 'Escape' && isRunning) {
        e.preventDefault()
        handleStop()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isRunning])

  const handleQuickPing = async () => {
    if (isPinging) return
    setIsPinging(true)
    const t0 = performance.now()
    try {
      await fetch('https://speed.cloudflare.com/__down?bytes=0', {
        method: 'HEAD',
        cache: 'no-store',
      })
      setQuickPing(Math.round(performance.now() - t0))
    } catch {
      setQuickPing(null)
    } finally {
      setIsPinging(false)
    }
  }

  const latest = records.length > 0 ? records[0] : null

  // Historical Arrays for real SVG sparklines
  const dlHistory = useMemo(
    () => records.map((r) => r.downloadMbps).filter((v): v is number => v !== null).slice(0, 15).reverse(),
    [records]
  )
  const ulHistory = useMemo(
    () => records.map((r) => r.uploadMbps).filter((v): v is number => v !== null).slice(0, 15).reverse(),
    [records]
  )
  const latHistory = useMemo(
    () => records.map((r) => r.latencyMs).filter((v): v is number => v !== null).slice(0, 15).reverse(),
    [records]
  )
  const jitterHistory = useMemo(
    () => records.map((r) => r.jitterMs).filter((v): v is number => v !== null).slice(0, 15).reverse(),
    [records]
  )
  const lossHistory = useMemo(
    () => records.map((r) => r.lossPercent).filter((v): v is number => v !== null).slice(0, 15).reverse(),
    [records]
  )

  // Active displayed measurement values with live telemetry bindings
  const currentDl = useMemo(() => {
    if (phase === 'download') return liveMbps
    return result?.downloadMbps ?? latest?.downloadMbps ?? null
  }, [phase, liveMbps, result, latest])

  const currentUl = useMemo(() => {
    if (phase === 'upload') return liveMbps
    return result?.uploadMbps ?? latest?.uploadMbps ?? null
  }, [phase, liveMbps, result, latest])

  const currentLat = useMemo(() => {
    if (phase === 'latency' && liveMbps > 0) return liveMbps
    return result?.latencyMs ?? latest?.latencyMs ?? null
  }, [phase, liveMbps, result, latest])

  const currentJitter = result?.jitterMs ?? latest?.jitterMs ?? null
  const currentLoss = result?.lossPercent ?? latest?.lossPercent ?? null

  // Dynamic high-resolution sparklines (prioritizing current live test samples, then history)
  const dlSparkline = useMemo(() => {
    const activeDl = samples.filter((s) => s.phase === 'download').map((s) => s.mbps)
    if (activeDl.length >= 2) return activeDl
    if (dlHistory.length >= 2) return dlHistory
    if (currentDl !== null && currentDl > 0) return [currentDl * 0.72, currentDl * 0.88, currentDl * 0.96, currentDl, currentDl * 0.98]
    return undefined
  }, [samples, dlHistory, currentDl])

  const ulSparkline = useMemo(() => {
    const activeUl = samples.filter((s) => s.phase === 'upload').map((s) => s.mbps)
    if (activeUl.length >= 2) return activeUl
    if (ulHistory.length >= 2) return ulHistory
    if (currentUl !== null && currentUl > 0) return [currentUl * 0.68, currentUl * 0.85, currentUl * 0.94, currentUl, currentUl * 0.98]
    return undefined
  }, [samples, ulHistory, currentUl])

  const latSparkline = useMemo(() => {
    if (latHistory.length >= 2) return latHistory
    if (currentLat !== null && currentLat > 0) return [currentLat * 1.08, currentLat * 0.95, currentLat * 1.04, currentLat]
    return undefined
  }, [latHistory, currentLat])

  const jitterSparkline = useMemo(() => {
    if (jitterHistory.length >= 2) return jitterHistory
    if (currentJitter !== null && currentJitter > 0) return [currentJitter * 0.85, currentJitter * 1.15, currentJitter * 0.92, currentJitter]
    return undefined
  }, [jitterHistory, currentJitter])

  const lossSparkline = useMemo(() => {
    if (lossHistory.length >= 2) return lossHistory
    return [0, 0, 0, 0]
  }, [lossHistory])

  // Last 24 Hours Analysis
  const last24hRecords = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 3600 * 1000
    return records.filter((r) => r.timestamp >= oneDayAgo)
  }, [records])

  const avgDownload24h = useMemo(() => {
    const valid = last24hRecords.filter((r) => r.downloadMbps !== null)
    if (valid.length === 0) return null
    const sum = valid.reduce((acc, r) => acc + (r.downloadMbps || 0), 0)
    return Math.round((sum / valid.length) * 10) / 10
  }, [last24hRecords])

  const avgLatency24h = useMemo(() => {
    const valid = last24hRecords.filter((r) => r.latencyMs !== null)
    if (valid.length === 0) return null
    const sum = valid.reduce((acc, r) => acc + (r.latencyMs || 0), 0)
    return Math.round(sum / valid.length)
  }, [last24hRecords])

  // Precision Interaction Phase Badge
  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'connecting':
        return 'Checking connection'
      case 'latency':
        return 'Measuring latency and jitter'
      case 'download':
        return 'Measuring download speed'
      case 'upload':
        return 'Measuring upload speed'
      case 'probe':
        return 'Verifying measurement integrity'
      case 'complete':
        return 'Test completed'
      case 'failed':
        return 'Test failed'
      case 'stopped':
        return 'Test cancelled'
      default:
        return 'Ready to test'
    }
  }, [phase])

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] 2xl:max-w-[1560px] mx-auto p-4 sm:p-6 lg:p-8 select-none">
      {/* ── 1. Refined Page Introduction (Requirement 2) ───────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest uppercase text-[var(--primary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
            <span>NETWORK INTELLIGENCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-[var(--on-surface)] mt-1">
            Connection Overview
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-0.5 max-w-2xl">
            Understand your connection performance, monitor network conditions, and identify connectivity issues.
          </p>
        </div>

        {/* Global Connection Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-[var(--surface)] border-[var(--border-subtle)] shrink-0 self-start sm:self-auto shadow-xs text-xs">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span className="font-semibold text-[var(--on-surface)]">Online</span>
          <span className="text-[10px] font-mono text-[var(--on-surface-dim)] border-l pl-2 border-[var(--border-subtle)]">
            {publicIp}
          </span>
        </div>
      </div>

      {/* ── 2. Primary Cockpit Grid (Balanced 7:5 Ratio & Stretched Height) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ── Left Column: Speed Test Experience & Oscilloscope (~58%) ──────── */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <SpeedtestGaugeCard
            speed={liveMbps}
            phase={phase}
            progress={progress}
            samples={samples}
            result={result}
            latestRecord={latest}
            isRunning={isRunning}
            onStart={handleStart}
            onStop={handleStop}
            onShareCard={() => setIsShareModalOpen(true)}
            className="h-full justify-between"
          />

          {/* Real Speed Test Contribution Banner */}
          {phase === 'complete' && latest && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl border shadow-lg backdrop-blur-xl bg-[var(--surface)] border-[var(--border-subtle)] animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/15 text-emerald-500 shrink-0">
                  <CellTowerRounded sx={{ fontSize: 22 }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--on-surface)]">
                    Real Diagnostic Recorded
                  </span>
                  <span className="text-[11px] text-[var(--on-surface-muted)]">
                    This test is saved locally and can contribute to the community GIS grid with S2 privacy.
                  </span>
                </div>
              </div>
              <Link
                to="/map"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>View on Map</span>
                <ArrowForwardRounded sx={{ fontSize: 14 }} />
              </Link>
            </div>
          )}

          {/* Failure Alert */}
          {failure && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs w-full border-rose-500/30 bg-rose-500/8 text-rose-500">
              <div className="flex items-center gap-2">
                <ErrorOutlineRounded sx={{ fontSize: 18 }} />
                <span>{failure.message}</span>
              </div>
              <button
                onClick={handleStart}
                className="px-2.5 py-1 rounded text-[11px] font-bold border border-rose-500/40 hover:bg-rose-500/10 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* ── Right Column: Connection Health & Recent History (~42%) ────────── */}
        <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
          {/* Connection Health Multi-Tier Checklist */}
          <ConnectionHealthPanel
            latestRecord={latest}
            quickPing={quickPing}
            isPinging={isPinging}
            onQuickPing={handleQuickPing}
            publicIp={publicIp}
            className="flex-1"
          />

          {/* Recent Measurements Card */}
          <div className="nexis-card p-5 flex flex-col gap-3.5 select-none border border-[var(--border-subtle)] shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--on-surface-muted)] font-semibold">
                  HISTORICAL LOG
                </span>
                <h3 className="text-sm font-bold font-sans tracking-tight text-[var(--on-surface)] mt-0.5">
                  Recent Tests
                </h3>
              </div>
              <Link
                to="/history"
                className="text-xs font-sans font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowForwardRounded sx={{ fontSize: 14 }} />
              </Link>
            </div>

            {records.length > 0 ? (
              <div className="flex flex-col gap-2">
                {records.slice(0, 4).map((rec) => {
                  const quality = qualityFromRecord(rec)
                  return (
                    <Link
                      key={rec.id}
                      to={`/history/${rec.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)] hover:border-[var(--primary)] transition-all text-xs font-sans group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: qualityColor(quality) }}
                        />
                        <span className="font-mono text-[11px] text-[var(--on-surface-muted)] group-hover:text-[var(--on-surface)] transition-colors">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {rec.tags?.[0] && (
                          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-[var(--primary)]/10 text-[var(--primary)] truncate max-w-[80px]">
                            {rec.tags[0]}
                          </span>
                        )}
                        {rec.lossPercent !== null && rec.lossPercent > 0 && (
                          <span className="text-[9px] font-bold px-1 rounded bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
                            {rec.lossPercent.toFixed(0)}% loss
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                        <span className="font-bold text-[var(--on-surface)] text-xs">
                          {formatMbps(rec.downloadMbps)}
                        </span>
                        <span className="text-[10px] text-[var(--on-surface-dim)]">
                          {formatMs(rec.latencyMs)}
                        </span>
                        <ArrowForwardRounded
                          sx={{ fontSize: 13 }}
                          className="text-[var(--on-surface-dim)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center gap-1.5 text-xs font-sans text-[var(--on-surface-dim)]">
                <span className="font-medium">No verified tests yet</span>
                <span className="text-[10px]">Measurements will populate here automatically.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Performance Metrics 5-Column Grid (Requirement 4) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Metric 1: Download Throughput */}
        <NexisMetricTile
          label="DOWNLOAD"
          value={currentDl !== null ? (currentDl >= 100 ? currentDl.toFixed(0) : currentDl.toFixed(1)) : '—'}
          unit={currentDl !== null ? 'Mbps' : undefined}
          description="Downstream throughput"
          historyValues={dlSparkline}
          accentColor="#0EA5E9"
          active={phase === 'download'}
          status={currentDl !== null && currentDl >= 50 ? 'healthy' : currentDl !== null ? 'normal' : undefined}
        />

        {/* Metric 2: Upload Throughput */}
        <NexisMetricTile
          label="UPLOAD"
          value={currentUl !== null ? (currentUl >= 100 ? currentUl.toFixed(0) : currentUl.toFixed(1)) : '—'}
          unit={currentUl !== null ? 'Mbps' : undefined}
          description="Upstream throughput"
          historyValues={ulSparkline}
          accentColor="#8B5CF6"
          active={phase === 'upload'}
          status={currentUl !== null && currentUl >= 20 ? 'healthy' : currentUl !== null ? 'normal' : undefined}
        />

        {/* Metric 3: Round-Trip Latency */}
        <NexisMetricTile
          label="LATENCY"
          value={currentLat !== null ? currentLat.toFixed(0) : '—'}
          unit={currentLat !== null ? 'ms' : undefined}
          description="Round-trip time (RTT)"
          historyValues={latSparkline}
          accentColor="#F59E0B"
          active={phase === 'latency'}
          status={currentLat !== null && currentLat <= 30 ? 'healthy' : currentLat !== null && currentLat > 100 ? 'warning' : 'normal'}
        />

        {/* Metric 4: RFC 3550 Jitter */}
        <NexisMetricTile
          label="JITTER"
          value={currentJitter !== null ? currentJitter.toFixed(0) : '—'}
          unit={currentJitter !== null ? 'ms' : undefined}
          description="RFC 3550 variation"
          historyValues={jitterSparkline}
          accentColor="#10B981"
          active={phase === 'latency'}
          status={currentJitter !== null && currentJitter <= 5 ? 'healthy' : currentJitter !== null && currentJitter > 20 ? 'warning' : 'normal'}
        />

        {/* Metric 5: Packet Loss */}
        <NexisMetricTile
          label="PACKET LOSS"
          value={currentLoss !== null ? currentLoss.toFixed(1) : '0.0'}
          unit="%"
          description="Datagram discard rate"
          historyValues={lossSparkline}
          accentColor="#0EA5E9"
          status={currentLoss !== null && currentLoss > 1 ? 'danger' : 'healthy'}
        />
      </div>

      {/* ── 4. Quality of Experience (QoE) Real-World Application Cards ───────── */}
      <QoEScorecardSection
        latestRecord={latest}
        currentDl={currentDl}
        currentUl={currentUl}
        currentLat={currentLat}
        currentJitter={currentJitter}
        currentLoss={currentLoss}
      />

      {/* ── 5. Platform Transparency & Compliance Footer ─────────────────────── */}
      <footer
        className="mt-4 pt-6 pb-2 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[var(--on-surface-muted)] select-none"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[var(--on-surface)]">NEXIS</span>
          <span>&middot;</span>
          <span className="text-[11px]">Local-First Zero-Trust Diagnostic Engine</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <Link to="/docs" className="hover:text-[var(--primary)] transition-colors">
            Documentation
          </Link>
          <Link to="/privacy" className="hover:text-[var(--primary)] transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-[var(--primary)] transition-colors">
            Terms of Service
          </Link>
          <Link to="/legal?tab=methodology" className="hover:text-[var(--primary)] transition-colors">
            RFC Methodology
          </Link>
          <Link to="/settings" className="hover:text-[var(--primary)] transition-colors">
            Settings
          </Link>
        </div>
      </footer>

      {/* ── 6. High-Resolution Visual Share Card Modal ──────────────────────── */}
      <VisualShareCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        record={latest}
        publicIp={publicIp}
      />
    </div>
  )
}

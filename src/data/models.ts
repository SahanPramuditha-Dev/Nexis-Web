// NEXIS domain models — mirrors Android's MeasurementRecord and related types

export type LocationPrecision = 'approximate' | 'precise'

export interface LocationSnapshot {
  lat: number
  lng: number
  accuracyM: number
  precision: LocationPrecision
}

export interface MeasurementRecord {
  id: string
  timestamp: number          // Unix ms
  latencyMs: number | null   // baseline idle median RTT ms
  loadedLatencyMs?: number | null // RTT under saturation
  downloadLoadedLatencyMs?: number | null // RTT under download saturation
  uploadLoadedLatencyMs?: number | null   // RTT under upload saturation
  bufferbloatMs?: number | null   // max delta RTT (loaded - idle)
  bufferbloatGrade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | null
  jitterMs: number | null    // RFC 3550 interarrival jitter ms
  lossPercent: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  endpointUrl: string
  methodVersion: string      // e.g. "nexis-web-v1"
  location: LocationSnapshot | null
  samples?: Array<{ timeSec: number; mbps: number; phase: 'download' | 'upload' }>
  durationSec?: number
  colo?: string
  isp?: string               // Real ISP/Carrier Name (e.g. "Sri Lanka Telecom Ltd", "Dialog Axiata")
  asn?: number               // Autonomous System Number (e.g. 9329)
  asnOrg?: string            // Network pool / organization
  clientIp?: string          // Public WAN IP
  tags?: string[]
  notes?: string
}

export type QualityLevel = 'healthy' | 'good' | 'degraded' | 'poor' | 'critical' | 'unknown'

/**
 * Composite QoE (Quality of Experience) scoring based on ITU-T telecom standards.
 * Accounts for packet loss, jitter variance, and RTT latency.
 */
export function qualityFromRecord(rec: {
  latencyMs: number | null
  jitterMs?: number | null
  lossPercent?: number | null
}): QualityLevel {
  const lat = rec.latencyMs
  const loss = rec.lossPercent ?? 0
  const jitter = rec.jitterMs ?? 0

  if (lat === null) return 'unknown'

  // Severe packet loss (>5%) or complete drops break TCP throughput and VoIP
  if (loss >= 10) return 'critical'
  if (loss >= 2) return 'poor'
  if (loss > 0) return 'degraded'

  // Jitter variance evaluation (RFC 3550)
  if (jitter > 50) return 'critical'
  if (jitter > 25) return 'poor'
  if (jitter > 12) return 'degraded'

  // RTT Latency evaluation
  if (lat < 30) return 'healthy'
  if (lat < 60) return 'good'
  if (lat < 100) return 'degraded'
  if (lat < 200) return 'poor'
  return 'critical'
}

export function qualityFromLatency(ms: number | null): QualityLevel {
  return qualityFromRecord({ latencyMs: ms })
}

export function qualityColor(level: QualityLevel): string {
  const map: Record<QualityLevel, string> = {
    healthy: 'var(--color-metric-healthy)',
    good: 'var(--color-metric-good)',
    degraded: 'var(--color-metric-degraded)',
    poor: 'var(--color-metric-poor)',
    critical: 'var(--color-metric-critical)',
    unknown: 'var(--on-surface-var)',
  }
  return map[level]
}

export function formatMbps(mbps: number | null): string {
  if (mbps === null) return '—'
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`
  if (mbps >= 100) return `${mbps.toFixed(0)} Mbps`
  return `${mbps.toFixed(1)} Mbps`
}

export function formatMs(ms: number | null): string {
  if (ms === null) return '—'
  return `${ms.toFixed(0)} ms`
}

export function getQualityLabel(level: QualityLevel, lossPercent?: number | null): string {
  if (lossPercent !== undefined && lossPercent !== null && lossPercent >= 10) {
    return 'Critical Loss'
  }
  switch (level) {
    case 'healthy':
      return 'Optimal'
    case 'good':
      return 'Good'
    case 'degraded':
      return 'Degraded'
    case 'poor':
      return 'Poor'
    case 'critical':
      return 'Severe Lag'
    default:
      return 'Unrated'
  }
}

export interface AppReadiness {
  gaming: 'excellent' | 'good' | 'poor'
  streaming: 'excellent' | 'good' | 'poor'
  videoCall: 'excellent' | 'good' | 'poor'
}

export function getAppReadiness(rec: MeasurementRecord): AppReadiness {
  const dl = rec.downloadMbps ?? 0
  const lat = rec.latencyMs ?? 999
  const loss = rec.lossPercent ?? 0
  const jitter = rec.jitterMs ?? 999

  return {
    gaming: lat < 45 && jitter < 12 && loss === 0 ? 'excellent' : lat < 90 && loss < 1 ? 'good' : 'poor',
    streaming: dl >= 25 && loss < 2 ? 'excellent' : dl >= 10 && loss < 5 ? 'good' : 'poor',
    videoCall: lat < 100 && jitter < 25 && loss < 1 && dl >= 3 ? 'excellent' : lat < 180 && loss < 3 ? 'good' : 'poor',
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 45) return 'Just now'
  if (diffSec < 90) return '1 min ago'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function exportToCsv(records: MeasurementRecord[]): string {
  const headers = [
    'id',
    'timestamp_iso',
    'timestamp_unix',
    'download_mbps',
    'upload_mbps',
    'latency_ms',
    'jitter_ms',
    'packet_loss_percent',
    'node',
    'endpoint',
    'latitude',
    'longitude',
    'tags',
    'notes',
  ]

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${new Date(r.timestamp).toISOString()}"`,
    r.timestamp,
    r.downloadMbps !== null ? r.downloadMbps.toFixed(2) : '',
    r.uploadMbps !== null ? r.uploadMbps.toFixed(2) : '',
    r.latencyMs !== null ? r.latencyMs.toFixed(1) : '',
    r.jitterMs !== null ? r.jitterMs.toFixed(1) : '',
    r.lossPercent !== null ? r.lossPercent.toFixed(1) : '0.0',
    `"${(r.colo || 'EDGE').replace(/"/g, '""')}"`,
    `"${(r.endpointUrl || '').replace(/"/g, '""')}"`,
    r.location ? r.location.lat.toFixed(6) : '',
    r.location ? r.location.lng.toFixed(6) : '',
    `"${(r.tags || []).join('; ').replace(/"/g, '""')}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')
}

export function exportToJson(records: MeasurementRecord[]): string {
  const payload = {
    app: 'NEXIS Telemetry Platform',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  }
  return JSON.stringify(payload, null, 2)
}

export function parseImportJson(jsonStr: string): MeasurementRecord[] {
  const parsed = JSON.parse(jsonStr)
  let rawList: unknown[] = []
  if (Array.isArray(parsed)) {
    rawList = parsed
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { records: unknown[] }).records)) {
    rawList = (parsed as { records: unknown[] }).records
  } else {
    throw new Error('Invalid JSON format: expected array or NEXIS backup object with "records" array.')
  }

  return rawList.filter((item): item is MeasurementRecord => {
    return (
      item !== null &&
      typeof item === 'object' &&
      typeof (item as MeasurementRecord).id === 'string' &&
      typeof (item as MeasurementRecord).timestamp === 'number'
    )
  })
}

export function generateShareSummary(rec: MeasurementRecord): string {
  const date = new Date(rec.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const dl = formatMbps(rec.downloadMbps)
  const ul = formatMbps(rec.uploadMbps)
  const lat = formatMs(rec.latencyMs)
  const jitter = formatMs(rec.jitterMs)
  const loss = rec.lossPercent !== null ? `${rec.lossPercent.toFixed(1)}%` : '0%'
  const node = rec.colo || 'Cloudflare Edge'

  return `[NEXIS Diagnostic Run]
Date: ${date}
Download: ${dl} | Upload: ${ul}
Latency: ${lat} | Jitter: ${jitter} | Loss: ${loss}
Node: ${node}${rec.tags?.length ? `\nTags: ${rec.tags.join(', ')}` : ''}${rec.notes ? `\nNotes: ${rec.notes}` : ''}`
}

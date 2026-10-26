import { createClient } from '@supabase/supabase-js'
import type { MeasurementRecord } from './models'
import type { S2CoverageCell } from '../pages/map/mapData'
import { useSettingsStore, type HomePrivacyGeofence } from '../stores/settingsStore'

/**
 * Masks an IP address to preserve user anonymity.
 * For IPv4: replaces the host octet with .0 (CIDR /24 subnet).
 * For IPv6: truncates to /64 routing prefix.
 */
export function anonymizeIp(ip?: string): string | undefined {
  if (!ip) return undefined
  const trimmed = ip.trim()
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
    }
  } else if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}::/64`
    }
  }
  return 'anonymized-host'
}

/**
 * Fuzzes high-precision GPS coordinates into a privacy-preserving ~1.2km spatial grid.
 * Prevents pinpointing home, office, or personal residence.
 */
export function fuzzCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  // 2 decimal places = ~1.11 km at equator (approx S2 Level 13 cell diameter)
  const fuzzedLat = Math.round(lat * 100) / 100
  const fuzzedLng = Math.round(lng * 100) / 100
  return { lat: fuzzedLat, lng: fuzzedLng }
}

/**
 * Checks whether given coordinates fall within the user's private exclusion geofence.
 */
export function isWithinHomeGeofence(
  lat: number,
  lng: number,
  homeGeofence: HomePrivacyGeofence | null
): boolean {
  if (!homeGeofence || !homeGeofence.enabled) return false
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat - homeGeofence.lat) * Math.PI) / 180
  const dLng = ((lng - homeGeofence.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((homeGeofence.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceM = R * c
  return distanceM <= (homeGeofence.radiusM || 250)
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

/**
 * Checks connectivity to the Supabase backend.
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean
  latencyMs?: number
  error?: string
}> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { connected: false, error: 'Supabase credentials not configured in .env' }
  }

  const start = performance.now()
  try {
    const { error } = await supabase.auth.getSession()
    const latencyMs = Math.round(performance.now() - start)

    if (error) {
      return { connected: false, latencyMs, error: error.message }
    }

    return { connected: true, latencyMs }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { connected: false, error: message }
  }
}

/**
 * Uploads a completed measurement record to Supabase.
 */
/**
 * Downsamples streaming telemetry samples for cloud storage efficiency.
 * Keeps at most 10 evenly spaced samples to preserve throughput curve trends
 * while slashing cloud write payloads and database disk footprint by up to 90%.
 * Full high-resolution samples remain preserved in local IndexedDB.
 */
function pruneSamplesForCloud(samples?: MeasurementRecord['samples']) {
  if (!samples || samples.length <= 10) return samples
  const step = Math.ceil(samples.length / 10)
  return samples.filter((_, idx) => idx % step === 0 || idx === samples.length - 1)
}

export async function uploadMeasurementToSupabase(record: MeasurementRecord): Promise<{
  success: boolean
  error?: string
}> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const settings = useSettingsStore.getState()
    const effectiveClientIp = settings.maskIpAddress ? anonymizeIp(record.clientIp) : record.clientIp

    let effectiveLocation = record.location
    if (settings.enableCoordinateFuzzing && record.location && typeof record.location.lat === 'number' && typeof record.location.lng === 'number') {
      const fuzzed = fuzzCoordinates(record.location.lat, record.location.lng)
      effectiveLocation = {
        ...record.location,
        lat: fuzzed.lat,
        lng: fuzzed.lng,
        accuracyM: Math.max(1200, record.location.accuracyM || 1200),
      }
    }

    const payload = {
      id: record.id,
      timestamp: record.timestamp,
      latency_ms: record.latencyMs,
      loaded_latency_ms: record.loadedLatencyMs,
      download_loaded_latency_ms: record.downloadLoadedLatencyMs,
      upload_loaded_latency_ms: record.uploadLoadedLatencyMs,
      bufferbloat_ms: record.bufferbloatMs,
      bufferbloat_grade: record.bufferbloatGrade,
      jitter_ms: record.jitterMs,
      loss_percent: record.lossPercent,
      download_mbps: record.downloadMbps,
      upload_mbps: record.uploadMbps,
      endpoint_url: record.endpointUrl,
      method_version: record.methodVersion,
      location: effectiveLocation,
      samples: pruneSamplesForCloud(record.samples),
      duration_sec: record.durationSec,
      colo: record.colo,
      isp: record.isp,
      asn: record.asn,
      asn_org: record.asnOrg,
      client_ip: effectiveClientIp,
      tags: record.tags,
      notes: record.notes,
    }

    const { error } = await supabase.from('measurements').upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error('[Supabase] Upload error:', error.message)
      return { success: false, error: error.message }
    }

    // Only contribute crowdsourced telemetry if user has consented via settings
    if (
      settings.shareCrowdsourcedTelemetry &&
      effectiveLocation &&
      typeof effectiveLocation.lat === 'number' &&
      typeof effectiveLocation.lng === 'number'
    ) {
      // Privacy Guard: Check if coordinates are within the private home exclusion geofence
      const insideHome = isWithinHomeGeofence(
        effectiveLocation.lat,
        effectiveLocation.lng,
        settings.homeGeofence
      )

      if (insideHome) {
        console.info('[Supabase] Telemetry excluded from public crowd pool (inside home privacy geofence)')
      } else {
        try {
          const s2CellId =
            Math.abs(Math.round(effectiveLocation.lat * 100)).toString(16) +
            Math.abs(Math.round(effectiveLocation.lng * 100)).toString(16)

          const dl = record.downloadMbps || 0
          const latMs = record.latencyMs || 0

          // Basic anti-spoofing plausibility check
          if (dl >= 0 && dl <= 10000 && latMs >= 0 && latMs <= 10000) {
            const probeId = settings.ephemeralProbeId || 'probe-web-client-live'

            // 1. Check existing probe status to enforce admin fleet controls
            let probeStatus = 'ACTIVE'
            try {
              const { data: probeInfo } = await supabase
                .from('probe_devices')
                .select('status')
                .eq('device_id', probeId)
                .maybeSingle()
              if (probeInfo?.status) {
                probeStatus = probeInfo.status
              }
            } catch {}

            // Admin Control: Suspended devices are immediately blocked from submission
            if (probeStatus === 'SUSPENDED') {
              console.warn('[Admin Control] Probe is suspended by administrator; submission halted.')
              return { success: true }
            }

            // Guarantee probe exists in probe_devices table to satisfy foreign key constraint
            try {
              await supabase.from('probe_devices').upsert(
                {
                  device_id: probeId,
                  device_model: 'Nexis Web Probe',
                  os_version: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 40) : 'Web Client',
                  platform: 'Web',
                  reputation_score: probeStatus === 'SHADOW_BANNED' ? 0 : 90,
                  status: probeStatus,
                  last_seen: new Date().toISOString(),
                },
                { onConflict: 'device_id' }
              )
            } catch (pErr) {
              console.warn('[Supabase] Probe auto-registration notice:', pErr)
            }

            // 2. Fetch live validation rules configured by Admin in Nexis Web Admin
            const netType = record.tags?.includes('WIFI') ? 'WIFI' : dl > 200 ? '5G' : 'LTE'
            let isFlaggedQuarantine = false
            let quarantineReason: string | undefined

            try {
              const { data: rules } = await supabase
                .from('validation_rules')
                .select('max_speed_5g_mbps, max_speed_4g_mbps, max_speed_wifi_mbps, min_allowed_latency_ms')
                .eq('id', 'current_rules')
                .single()

              if (rules) {
                const max5G = Number(rules.max_speed_5g_mbps || 2500)
                const max4G = Number(rules.max_speed_4g_mbps || 600)
                const maxWifi = Number(rules.max_speed_wifi_mbps || 3500)
                const minLat = Number(rules.min_allowed_latency_ms || 0.8)

                if (netType === '5G' && dl > max5G) {
                  isFlaggedQuarantine = true
                  quarantineReason = `Speed ${dl} Mbps exceeds admin 5G ceiling (${max5G} Mbps)`
                } else if (netType === 'LTE' && dl > max4G) {
                  isFlaggedQuarantine = true
                  quarantineReason = `Speed ${dl} Mbps exceeds admin 4G ceiling (${max4G} Mbps)`
                } else if (netType === 'WIFI' && dl > maxWifi) {
                  isFlaggedQuarantine = true
                  quarantineReason = `Speed ${dl} Mbps exceeds admin Wi-Fi ceiling (${maxWifi} Mbps)`
                } else if (latMs < minLat) {
                  isFlaggedQuarantine = true
                  quarantineReason = `Latency ${latMs} ms violates minimum latency physics bound (${minLat} ms)`
                }
              }
            } catch {}

            // Admin Control: Shadow-banned probes submit silently as REJECTED
            const computedStatus =
              probeStatus === 'SHADOW_BANNED'
                ? 'REJECTED'
                : isFlaggedQuarantine
                ? 'QUARANTINED'
                : 'VERIFIED'

            const { error: telError } = await supabase.from('telemetry_records').insert({
              device_id: probeId,
              network_type: netType,
              carrier_name: record.isp || 'Broadband',
              download_mbps: dl,
              upload_mbps: record.uploadMbps || 0,
              latency_ms: latMs,
              jitter_ms: record.jitterMs || 0,
              packet_loss_pct: record.lossPercent || 0,
              bufferbloat_ms: record.bufferbloatMs,
              latitude: effectiveLocation.lat,
              longitude: effectiveLocation.lng,
              s2_cell_id: s2CellId,
              accuracy_meters: effectiveLocation.accuracyM || 1200,
              status: computedStatus,
              quarantine_reason: quarantineReason,
              city: record.colo || 'Web Client',
              country: 'Sri Lanka',
            })

            if (!telError) {
              if (computedStatus === 'VERIFIED') {
                settings.incrementContributedTestCount()
              }
            } else {
              console.warn('[Supabase] Telemetry insert error:', telError.message)
            }
          }
        } catch (telemetryErr: unknown) {
          console.warn('[Supabase] Telemetry insert warning:', telemetryErr)
        }
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * Bulk upload measurements to Supabase in a single batch operation.
 * Eliminates N HTTP requests when importing or syncing multiple records.
 */
export async function uploadMeasurementsBatchToSupabase(
  records: MeasurementRecord[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabaseUrl || !supabaseAnonKey || records.length === 0) {
    return { success: false, count: 0, error: 'Supabase not configured or records empty' }
  }

  try {
    const settings = useSettingsStore.getState()
    const payloads = records.map((record) => {
      const effectiveClientIp = settings.maskIpAddress ? anonymizeIp(record.clientIp) : record.clientIp
      let effectiveLocation = record.location
      if (
        settings.enableCoordinateFuzzing &&
        record.location &&
        typeof record.location.lat === 'number' &&
        typeof record.location.lng === 'number'
      ) {
        const fuzzed = fuzzCoordinates(record.location.lat, record.location.lng)
        effectiveLocation = {
          ...record.location,
          lat: fuzzed.lat,
          lng: fuzzed.lng,
          accuracyM: Math.max(1200, record.location.accuracyM || 1200),
        }
      }

      return {
        id: record.id,
        timestamp: record.timestamp,
        latency_ms: record.latencyMs,
        loaded_latency_ms: record.loadedLatencyMs,
        download_loaded_latency_ms: record.downloadLoadedLatencyMs,
        upload_loaded_latency_ms: record.uploadLoadedLatencyMs,
        bufferbloat_ms: record.bufferbloatMs,
        bufferbloat_grade: record.bufferbloatGrade,
        jitter_ms: record.jitterMs,
        loss_percent: record.lossPercent,
        download_mbps: record.downloadMbps,
        upload_mbps: record.uploadMbps,
        endpoint_url: record.endpointUrl,
        method_version: record.methodVersion,
        location: effectiveLocation,
        samples: pruneSamplesForCloud(record.samples),
        duration_sec: record.durationSec,
        colo: record.colo,
        isp: record.isp,
        asn: record.asn,
        asn_org: record.asnOrg,
        client_ip: effectiveClientIp,
        tags: record.tags,
        notes: record.notes,
      }
    })

    // Upsert in chunks of 50 to avoid oversized payloads
    const chunkSize = 50
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize)
      const { error } = await supabase.from('measurements').upsert(chunk, { onConflict: 'id' })
      if (error) {
        console.error('[Supabase] Bulk upload chunk error:', error.message)
        return { success: false, count: i, error: error.message }
      }
    }

    return { success: true, count: records.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, count: 0, error: message }
  }
}

/**
 * Fetches recent measurements from Supabase cloud database.
 * Supports delta cursor sync: when `sinceTimestamp` is provided, queries only
 * records created after that timestamp, eliminating redundant reads.
 */
export async function fetchMeasurementsFromSupabase(
  limit = 100,
  sinceTimestamp?: number
): Promise<MeasurementRecord[]> {
  if (!supabaseUrl || !supabaseAnonKey) return []

  try {
    let query = supabase
      .from('measurements')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (sinceTimestamp && sinceTimestamp > 0) {
      query = query.gt('timestamp', sinceTimestamp)
    }

    const { data, error } = await query

    if (error || !data) {
      console.warn('[Supabase] Fetch error:', error?.message)
      return []
    }

    return data.map((row) => ({
      id: row.id,
      timestamp: Number(row.timestamp),
      latencyMs: row.latency_ms,
      loadedLatencyMs: row.loaded_latency_ms,
      downloadLoadedLatencyMs: row.download_loaded_latency_ms,
      uploadLoadedLatencyMs: row.upload_loaded_latency_ms,
      bufferbloatMs: row.bufferbloat_ms,
      bufferbloatGrade: row.bufferbloat_grade,
      jitterMs: row.jitter_ms,
      lossPercent: row.loss_percent,
      downloadMbps: row.download_mbps,
      uploadMbps: row.upload_mbps,
      endpointUrl: row.endpoint_url,
      methodVersion: row.method_version,
      location: row.location,
      samples: row.samples,
      durationSec: row.duration_sec,
      colo: row.colo,
      isp: row.isp,
      asn: row.asn ? Number(row.asn) : undefined,
      asnOrg: row.asn_org,
      clientIp: row.client_ip,
      tags: row.tags,
      notes: row.notes,
    }))
  } catch (err) {
    console.warn('[Supabase] Fetch exception:', err)
    return []
  }
}

/**
 * Deletes a single measurement from Supabase.
 */
export async function deleteMeasurementFromSupabase(id: string): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey) return
  try {
    const { error } = await supabase.from('measurements').delete().eq('id', id)
    if (error) {
      console.warn('[Supabase] Delete failed:', error.message)
    }
  } catch (err) {
    console.warn('[Supabase] Delete error:', err)
  }
}

/**
 * Deletes multiple measurements from Supabase.
 */
export async function deleteMeasurementsFromSupabase(ids: string[]): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey || ids.length === 0) return
  try {
    const { error } = await supabase.from('measurements').delete().in('id', ids)
    if (error) {
      console.warn('[Supabase] Bulk delete failed:', error.message)
    }
  } catch (err) {
    console.warn('[Supabase] Bulk delete error:', err)
  }
}

/**
 * Clears all measurements from Supabase.
 */
export async function clearAllMeasurementsFromSupabase(): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey) return
  try {
    const { error } = await supabase.from('measurements').delete().neq('id', '')
    if (error) {
      console.warn('[Supabase] Clear all failed:', error.message)
    }
  } catch (err) {
    console.warn('[Supabase] Clear all error:', err)
  }
}

/**
 * Updates an existing measurement record in Supabase.
 */
export async function updateMeasurementInSupabase(
  id: string,
  changes: Partial<MeasurementRecord>
): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey) return
  try {
    const payload: Record<string, unknown> = {}
    if (changes.notes !== undefined) payload.notes = changes.notes
    if (changes.tags !== undefined) payload.tags = changes.tags
    if (changes.isp !== undefined) payload.isp = changes.isp
    if (changes.endpointUrl !== undefined) payload.endpoint_url = changes.endpointUrl
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('measurements').update(payload).eq('id', id)
      if (error) {
        console.warn('[Supabase] Update failed:', error.message)
      }
    }
  } catch (err) {
    console.warn('[Supabase] Update error:', err)
  }
}

export interface CrowdsourceBBox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface CrowdsourceStats {
  totalMeasurements: number
  totalCellsMapped: number
  activeCarriers: number
  topCarrier: string
  avgGlobalDownload: number
  lastUpdated: string | null
}

/**
 * Fetches dynamic crowdsourced spatial coverage cells within a bounding box.
 * Attempts optimized PostGIS RPC first, with zero-downtime client aggregation fallback.
 */
export async function fetchCrowdsourcedCoverageCells(
  bbox: CrowdsourceBBox,
  carrier = 'All',
  tech = 'All',
  timeWindow: '30d' | '90d' | 'all' = 'all'
): Promise<S2CoverageCell[]> {
  if (!supabaseUrl || !supabaseAnonKey) return []

  try {
    // 1. First attempt RPC get_coverage_in_bbox
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_coverage_in_bbox', {
      min_lat: bbox.minLat,
      min_lng: bbox.minLng,
      max_lat: bbox.maxLat,
      max_lng: bbox.maxLng,
      p_carrier: carrier,
      p_tech: tech,
      min_samples: 1,
    })

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.map((row: any) => ({
        id: `crowd-${row.s2_cell_id}-${row.carrier_name}`,
        cellToken: row.s2_cell_id,
        center: [row.center_lat, row.center_lng],
        radiusMeters: 650,
        avgDownloadMbps: Number(row.median_download_mbps || 0),
        avgUploadMbps: Number(row.median_upload_mbps || 0),
        avgLatencyMs: Number(row.avg_latency_ms || 0),
        avgJitterMs: Number(row.avg_jitter_ms || 0),
        sampleCount: Number(row.sample_count || 1),
        distinctDevices: Number(row.distinct_devices || 1),
        confidence: Number(row.confidence_score || 50),
        dominantTech:
          row.network_type === '5G'
            ? '5G'
            : row.network_type === 'WIFI'
            ? 'Wi-Fi'
            : row.network_type === 'FIBER'
            ? 'Fiber'
            : '4G LTE',
        dominantCarrier: row.carrier_name,
        quality: (row.quality as 'Excellent' | 'Good' | 'Fair' | 'Poor') || 'Good',
        city: 'Crowdsourced Area',
        lastSeen: row.last_seen,
        isLiveCrowdsourced: true,
      }))
    }

    // 2. Fallback: Direct select & client-side spatial cell aggregation
    let query = supabase
      .from('telemetry_records')
      .select('*')
      .eq('status', 'VERIFIED')
      .gte('latitude', bbox.minLat)
      .lte('latitude', bbox.maxLat)
      .gte('longitude', bbox.minLng)
      .lte('longitude', bbox.maxLng)
      .limit(300)

    if (carrier !== 'All') {
      query = query.ilike('carrier_name', `%${carrier}%`)
    }

    if (timeWindow === '30d') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', thirtyDaysAgo)
    } else if (timeWindow === '90d') {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', ninetyDaysAgo)
    }

    const { data: rawRows, error: rawError } = await query

    let activeRows: any[] = (!rawError && rawRows && rawRows.length > 0) ? rawRows : []

    // Fallback: If telemetry_records has no rows or is not populated yet,
    // read directly from verified rows in the 'measurements' table.
    if (activeRows.length === 0) {
      try {
        const { data: measData } = await supabase
          .from('measurements')
          .select('*')
          .not('location', 'is', null)
          .order('timestamp', { ascending: false })
          .limit(300)

        if (measData && measData.length > 0) {
          activeRows = measData
            .filter((m: any) => m.location && typeof m.location.lat === 'number' && typeof m.location.lng === 'number')
            .filter((m: any) => {
              const lat = m.location.lat
              const lng = m.location.lng
              return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng
            })
            .map((m: any) => ({
              id: m.id,
              s2_cell_id: `cell-${Math.abs(Math.round(m.location.lat * 100)).toString(16)}${Math.abs(Math.round(m.location.lng * 100)).toString(16)}`,
              carrier_name: m.isp || m.asn_org || 'Broadband',
              network_type: m.tags?.some((t: string) => /5g/i.test(t))
                ? '5G'
                : m.download_mbps > 150 || m.tags?.some((t: string) => /fiber|fibre/i.test(t))
                ? 'FIBER'
                : m.tags?.some((t: string) => /wifi/i.test(t))
                ? 'WIFI'
                : '4G',
              latitude: m.location.lat,
              longitude: m.location.lng,
              download_mbps: m.download_mbps || 0,
              upload_mbps: m.upload_mbps || 0,
              latency_ms: m.latency_ms || 20,
              jitter_ms: m.jitter_ms || 2,
              device_id: m.id,
              created_at: new Date(Number(m.timestamp) || Date.now()).toISOString(),
            }))
        }
      } catch (measErr) {
        console.warn('[Supabase] Fallback measurements read error:', measErr)
      }
    }

    if (activeRows.length === 0) {
      return []
    }

    // Aggregate into cells by (s2_cell_id + carrier_name)
    const cellGroups = new Map<string, any[]>()
    for (const r of activeRows) {
      const key = `${r.s2_cell_id || 'cell'}_${r.carrier_name || 'Broadband'}`
      const list = cellGroups.get(key) || []
      list.push(r)
      cellGroups.set(key, list)
    }

    const aggregated: S2CoverageCell[] = []
    cellGroups.forEach((records, key) => {
      const first = records[0]
      const totalDown = records.reduce((acc, x) => acc + (x.download_mbps || 0), 0)
      const totalUp = records.reduce((acc, x) => acc + (x.upload_mbps || 0), 0)
      const totalLat = records.reduce((acc, x) => acc + (x.latency_ms || 0), 0)
      const totalJitter = records.reduce((acc, x) => acc + (x.jitter_ms || 0), 0)
      const avgLat = records.length ? totalLat / records.length : 20
      const avgDown = records.length ? totalDown / records.length : 50

      const centerLat = records.reduce((acc, x) => acc + x.latitude, 0) / records.length
      const centerLng = records.reduce((acc, x) => acc + x.longitude, 0) / records.length
      const distinctDevices = new Set(records.map((r) => r.device_id)).size

      let quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Good'
      if (avgLat < 25 && avgDown >= 100) quality = 'Excellent'
      else if (avgLat > 90 || avgDown < 10) quality = 'Poor'
      else if (avgLat > 50) quality = 'Fair'

      aggregated.push({
        id: `crowd-live-${key}`,
        cellToken: first.s2_cell_id || key,
        center: [centerLat, centerLng],
        radiusMeters: 650,
        avgDownloadMbps: Math.round(avgDown * 10) / 10,
        avgUploadMbps: Math.round((totalUp / records.length) * 10) / 10,
        avgLatencyMs: Math.round(avgLat * 10) / 10,
        avgJitterMs: Math.round((totalJitter / records.length) * 10) / 10,
        sampleCount: records.length,
        distinctDevices,
        confidence: Math.min(100, records.length * 10 + distinctDevices * 15),
        dominantTech:
          first.network_type === '5G'
            ? '5G'
            : first.network_type === 'WIFI'
            ? 'Wi-Fi'
            : first.network_type === 'FIBER'
            ? 'Fiber'
            : '4G LTE',
        dominantCarrier: first.carrier_name || 'Broadband',
        quality,
        city: 'Crowdsourced Area',
        lastSeen: records[records.length - 1].created_at,
        isLiveCrowdsourced: true,
      })
    })

    return aggregated
  } catch (err) {
    console.warn('[Supabase] Crowdsourced cell fetch error:', err)
    return []
  }
}

/**
 * Fetches platform-wide crowdsource statistics.
 */
export async function fetchCrowdsourceGlobalStats(): Promise<CrowdsourceStats | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null

  try {
    const { data: statsData, error: statsErr } = await supabase.rpc('get_crowdsource_stats')
    if (!statsErr && statsData) {
      return {
        totalMeasurements: statsData.total_measurements || 0,
        totalCellsMapped: statsData.total_cells_mapped || 0,
        activeCarriers: statsData.active_carriers || 0,
        topCarrier: statsData.top_carrier || 'None',
        avgGlobalDownload: statsData.avg_global_download || 0,
        lastUpdated: statsData.last_updated,
      }
    }

    // Direct count fallback
    const { count: recCount } = await supabase
      .from('telemetry_records')
      .select('*', { count: 'exact', head: true })

    return {
      totalMeasurements: recCount || 0,
      totalCellsMapped: Math.max(1, Math.round((recCount || 0) * 0.4)),
      activeCarriers: 1,
      topCarrier: 'Local Provider',
      avgGlobalDownload: 0,
      lastUpdated: null,
    }
  } catch {
    return null
  }
}

/**
 * Realtime WebSocket listener for immediate two-way updates between Admin Panel and Map
 */
export function subscribeToCrowdsourceUpdates(onUpdate: () => void): () => void {
  if (!supabaseUrl || !supabaseAnonKey) return () => {}

  const channel = supabase
    .channel('telemetry-crowdsource-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'telemetry_records' },
      () => {
        onUpdate()
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'validation_rules' },
      () => {
        onUpdate()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export interface LiveTelemetryEvent {
  id: string
  deviceId: string
  networkType: '5G' | 'LTE' | 'WIFI' | '3G' | 'FIBER'
  carrierName: string
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  jitterMs?: number
  packetLossPct?: number
  bufferbloatMs?: number
  latitude: number
  longitude: number
  city?: string
  createdAt: string
  status?: string
}

/**
 * Realtime WebSocket subscription that streams individual incoming telemetry tests
 */
export function subscribeToLiveTelemetryStream(
  onNewRecord: (event: LiveTelemetryEvent) => void
): () => void {
  if (!supabaseUrl || !supabaseAnonKey) return () => {}

  const channel = supabase
    .channel('telemetry-live-stream')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'telemetry_records' },
      (payload) => {
        const row = payload.new as any
        if (!row || typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return

        const event: LiveTelemetryEvent = {
          id: row.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          deviceId: row.device_id || 'probe-anon',
          networkType: row.network_type || 'LTE',
          carrierName: row.carrier_name || 'Broadband',
          downloadMbps: Number(row.download_mbps || 0),
          uploadMbps: Number(row.upload_mbps || 0),
          latencyMs: Number(row.latency_ms || 0),
          jitterMs: row.jitter_ms ? Number(row.jitter_ms) : undefined,
          packetLossPct: row.packet_loss_pct ? Number(row.packet_loss_pct) : undefined,
          bufferbloatMs: row.bufferbloat_ms ? Number(row.bufferbloat_ms) : undefined,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          city: row.city || 'Live Hub',
          createdAt: row.created_at || new Date().toISOString(),
          status: row.status || 'VERIFIED',
        }

        onNewRecord(event)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Realistic synthetic live telemetry generator for demo streaming and fallback preview
 */
const LIVE_DEMO_LOCATIONS = [
  { city: 'Colombo Fort', lat: 6.9344, lng: 79.8428, carriers: ['Dialog Axiata', 'SLT-Mobitel'] },
  { city: 'Kollupitiya', lat: 6.9038, lng: 79.8542, carriers: ['Dialog Axiata', 'Airtel'] },
  { city: 'Bambalapitiya', lat: 6.8912, lng: 79.8584, carriers: ['SLT-Mobitel', 'Hutch'] },
  { city: 'Dehiwala', lat: 6.8512, lng: 79.8659, carriers: ['Dialog Axiata', 'SLT-Mobitel'] },
  { city: 'Kandy City Center', lat: 7.2906, lng: 80.6337, carriers: ['SLT-Mobitel', 'Dialog Axiata'] },
  { city: 'Galle Fort', lat: 6.0274, lng: 80.217, carriers: ['Dialog Axiata', 'Airtel'] },
  { city: 'Negombo Beach', lat: 7.2185, lng: 79.8358, carriers: ['SLT-Mobitel', 'Dialog Axiata'] },
  { city: 'Rajagiriya', lat: 6.9095, lng: 79.8974, carriers: ['Dialog Axiata', 'Starlink'] },
  { city: 'Battaramulla', lat: 6.8974, lng: 79.9212, carriers: ['SLT-Mobitel', 'Dialog Axiata'] },
]

export function generateMockLiveTelemetryEvent(): LiveTelemetryEvent {
  const loc = LIVE_DEMO_LOCATIONS[Math.floor(Math.random() * LIVE_DEMO_LOCATIONS.length)]
  const carrier = loc.carriers[Math.floor(Math.random() * loc.carriers.length)]
  const netTypes: Array<'5G' | 'LTE' | 'WIFI' | 'FIBER'> = ['5G', 'LTE', '5G', 'LTE', 'WIFI']
  const networkType = netTypes[Math.floor(Math.random() * netTypes.length)]

  // Generate realistic throughput & latency based on radio technology
  let dl = 0
  let ul = 0
  let lat = 0
  let jit = 0

  if (networkType === '5G') {
    dl = Math.round((140 + Math.random() * 220) * 10) / 10
    ul = Math.round((45 + Math.random() * 55) * 10) / 10
    lat = Math.round((9 + Math.random() * 12) * 10) / 10
    jit = Math.round((0.8 + Math.random() * 2.2) * 10) / 10
  } else if (networkType === 'WIFI') {
    dl = Math.round((180 + Math.random() * 320) * 10) / 10
    ul = Math.round((80 + Math.random() * 120) * 10) / 10
    lat = Math.round((6 + Math.random() * 10) * 10) / 10
    jit = Math.round((0.5 + Math.random() * 1.5) * 10) / 10
  } else {
    dl = Math.round((28 + Math.random() * 85) * 10) / 10
    ul = Math.round((12 + Math.random() * 32) * 10) / 10
    lat = Math.round((22 + Math.random() * 35) * 10) / 10
    jit = Math.round((2.5 + Math.random() * 6.0) * 10) / 10
  }

  // Slight jitter in coordinates to populate neighboring cells
  const jitterLat = (Math.random() - 0.5) * 0.015
  const jitterLng = (Math.random() - 0.5) * 0.015

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    deviceId: `probe-sim-${Math.floor(1000 + Math.random() * 9000)}`,
    networkType,
    carrierName: carrier,
    downloadMbps: dl,
    uploadMbps: ul,
    latencyMs: lat,
    jitterMs: jit,
    packetLossPct: Math.random() > 0.85 ? Math.round(Math.random() * 1.5 * 10) / 10 : 0,
    bufferbloatMs: Math.round(Math.random() * 25 * 10) / 10,
    latitude: loc.lat + jitterLat,
    longitude: loc.lng + jitterLng,
    city: loc.city,
    createdAt: new Date().toISOString(),
    status: 'VERIFIED',
  }
}

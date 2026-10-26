import Dexie, { type Table } from 'dexie'
import type { MeasurementRecord } from './models'
import type { CellTowerSite } from '@/pages/map/mapData'
import {
  uploadMeasurementToSupabase,
  uploadMeasurementsBatchToSupabase,
  fetchMeasurementsFromSupabase,
  deleteMeasurementFromSupabase,
  deleteMeasurementsFromSupabase,
  clearAllMeasurementsFromSupabase,
  updateMeasurementInSupabase,
} from './supabaseClient'
import { dedupePromise } from './dedupe'

export interface CachedTileRecord {
  key: string
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
  fetchedAt: number
  expiresAt: number
  count: number
}

export interface ProbeAuditRecord {
  id: string
  timestamp: number
  toolId: string
  toolName: string
  summary: string
  score?: number
  grade?: string
  status: 'passed' | 'warning' | 'error'
  metrics: Record<string, any>
}

export class NexisDatabase extends Dexie {
  measurements!: Table<MeasurementRecord>
  towers!: Table<CellTowerSite>
  cached_tiles!: Table<CachedTileRecord>
  probe_audits!: Table<ProbeAuditRecord>

  constructor() {
    super('nexis-web-v1')
    this.version(1).stores({
      // id is primary key; timestamp and location are indexed for queries
      measurements: 'id, timestamp, location.lat',
    })
    this.version(2).stores({
      measurements: 'id, timestamp, location.lat',
      towers: 'id, latitude, longitude, carrierName',
    })
    this.version(3).stores({
      measurements: 'id, timestamp, location.lat, [timestamp+carrierName]',
      towers: 'id, latitude, longitude, carrierName, [latitude+longitude]',
      cached_tiles: 'key, expiresAt',
    })
    this.version(4).stores({
      measurements: 'id, timestamp, location.lat, [timestamp+carrierName]',
      towers: 'id, latitude, longitude, carrierName, [latitude+longitude]',
      cached_tiles: 'key, expiresAt',
      probe_audits: 'id, timestamp, toolId, status',
    })
  }
}

export const db = new NexisDatabase()

// ── History helpers ────────────────────────────────────────────────────────────

/** Insert a new measurement record and automatically sync to Supabase */
export async function insertMeasurement(record: MeasurementRecord): Promise<void> {
  await db.measurements.put(record)
  uploadMeasurementToSupabase(record).catch((err) => {
    console.warn('[Supabase] Auto-sync failed:', err)
  })
}

let lastCloudSyncTime = 0
const CLOUD_SYNC_TTL_MS = 3 * 60 * 1000 // 3 minutes TTL for background cloud refresh

/**
 * Load the most recent N records with Stale-While-Revalidate (SWR) logic.
 * Returns local Dexie records instantly (0ms) and asynchronously pulls
 * new cloud entries in the background if the cache window is exceeded.
 */
export async function getRecentMeasurements(limit = 100, forceSync = false): Promise<MeasurementRecord[]> {
  const local = await db.measurements.orderBy('timestamp').reverse().limit(limit).toArray()

  const isCacheExpired = Date.now() - lastCloudSyncTime > CLOUD_SYNC_TTL_MS
  const shouldSync = forceSync || local.length === 0 || isCacheExpired

  if (shouldSync) {
    const syncPromise = dedupePromise('supabase_measurements_sync', async () => {
      try {
        // Delta cursor sync: only pull records created after the newest local record
        const latestLocal = local[0]
        const sinceTimestamp = forceSync ? undefined : latestLocal?.timestamp

        const cloud = await fetchMeasurementsFromSupabase(limit, sinceTimestamp)
        if (cloud.length > 0) {
          await db.measurements.bulkPut(cloud).catch(() => {})
        }
        lastCloudSyncTime = Date.now()
      } catch (err) {
        console.warn('[Supabase] Background sync notice:', err)
      }
    })

    // If local records already exist, return them immediately without waiting on network
    if (local.length > 0) {
      syncPromise.catch(() => {})
      return local
    }

    // First boot with empty local DB: await sync so the screen isn't blank
    await syncPromise
    return db.measurements.orderBy('timestamp').reverse().limit(limit).toArray()
  }

  return local
}

/** Load a single record by id */
export async function getMeasurementById(id: string): Promise<MeasurementRecord | undefined> {
  return db.measurements.get(id)
}

/** Load all records that have location data */
export async function getLocatedMeasurements(): Promise<MeasurementRecord[]> {
  return db.measurements
    .filter((r) => r.location !== null && r.location !== undefined && typeof r.location.lat === 'number')
    .toArray()
}

/** Load all measurements from database */
export async function getAllMeasurements(): Promise<MeasurementRecord[]> {
  return db.measurements.orderBy('timestamp').reverse().toArray()
}

/** Update an existing measurement record */
export async function updateMeasurement(id: string, changes: Partial<MeasurementRecord>): Promise<void> {
  await db.measurements.update(id, changes)
  updateMeasurementInSupabase(id, changes).catch(() => {})
}

/** Count all stored records */
export async function countMeasurements(): Promise<number> {
  return db.measurements.count()
}

/** Delete a single measurement by id from both local IndexedDB and Supabase cloud */
export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id)
  await deleteMeasurementFromSupabase(id)
}

/** Delete multiple measurements by ids from both local IndexedDB and Supabase cloud */
export async function deleteMeasurements(ids: string[]): Promise<void> {
  await db.measurements.bulkDelete(ids)
  await deleteMeasurementsFromSupabase(ids)
}

/** Bulk import measurement records with batch write optimization */
export async function importMeasurements(records: MeasurementRecord[]): Promise<number> {
  if (records.length === 0) return 0
  await db.measurements.bulkPut(records)
  uploadMeasurementsBatchToSupabase(records).catch((err) => {
    console.warn('[Supabase] Bulk import sync warning:', err)
  })
  return records.length
}

/** Delete all records from both local IndexedDB and Supabase cloud */
export async function clearAllMeasurements(): Promise<void> {
  await db.measurements.clear()
  await clearAllMeasurementsFromSupabase()
}

/** Cache towers into IndexedDB */
export async function cacheTowers(towers: CellTowerSite[]): Promise<void> {
  if (towers.length === 0) return
  await db.towers.bulkPut(towers)
}

/** Get all cached towers (fallback) */
export async function getCachedTowers(): Promise<CellTowerSite[]> {
  return db.towers.toArray()
}

/** Get a single cached tower by ID */
export async function getTowerById(id: string): Promise<CellTowerSite | undefined> {
  return db.towers.get(id)
}

/**
 * High-performance bounding box query utilizing Dexie indexed range on latitude.
 * Eliminates full-table scans when rendering viewport towers.
 */
export async function getCachedTowersInBBox(bbox: {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}): Promise<CellTowerSite[]> {
  return db.towers
    .where('latitude')
    .between(bbox.minLat, bbox.maxLat, true, true)
    .filter((t) => t.longitude >= bbox.minLng && t.longitude <= bbox.maxLng)
    .toArray()
}

/** Check if a geographic tile was already queried within TTL */
export async function isTileCached(key: string): Promise<boolean> {
  try {
    const tile = await db.cached_tiles.get(key)
    if (!tile) return false
    if (tile.expiresAt < Date.now()) {
      await db.cached_tiles.delete(key).catch(() => {})
      return false
    }
    return true
  } catch {
    return false
  }
}

/** Record that a geographic tile was queried and cached */
export async function setTileCached(
  key: string,
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number },
  count: number,
  ttlMs = 7 * 24 * 60 * 60 * 1000 // 7 days default
): Promise<void> {
  try {
    await db.cached_tiles.put({
      key,
      ...bbox,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      count,
    })
  } catch (err) {
    console.warn('[IndexedDB] Failed to cache tile metadata:', err)
  }
}

// ── Persistent Probe Audits ──────────────────────────────────────────────────

/** Insert a diagnostic probe audit into IndexedDB */
export async function insertProbeAudit(audit: ProbeAuditRecord): Promise<void> {
  try {
    await db.probe_audits.put(audit)
  } catch (err) {
    console.warn('[IndexedDB] Failed to save probe audit:', err)
  }
}

/** Retrieve all historical probe audits sorted by newest first */
export async function getAllProbeAudits(): Promise<ProbeAuditRecord[]> {
  try {
    return await db.probe_audits.orderBy('timestamp').reverse().toArray()
  } catch (err) {
    console.warn('[IndexedDB] Failed to load probe audits:', err)
    return []
  }
}

/** Delete a single probe audit by ID */
export async function deleteProbeAudit(id: string): Promise<void> {
  try {
    await db.probe_audits.delete(id)
  } catch (err) {
    console.warn('[IndexedDB] Failed to delete probe audit:', err)
  }
}

/** Clear all stored probe audits */
export async function clearAllProbeAudits(): Promise<void> {
  try {
    await db.probe_audits.clear()
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear probe audits:', err)
  }
}

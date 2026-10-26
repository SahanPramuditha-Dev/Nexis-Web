import { create } from 'zustand'
import type { MeasurementRecord } from '@/data/models'
import {
  getRecentMeasurements,
  insertMeasurement,
  deleteMeasurement,
  deleteMeasurements,
  updateMeasurement,
  importMeasurements,
  clearAllMeasurements,
  countMeasurements,
} from '@/data/db'

interface HistoryState {
  records: MeasurementRecord[]
  loading: boolean
  error: string | null

  load(forceSync?: boolean): Promise<void>
  add(record: MeasurementRecord): Promise<void>
  deleteRecord(id: string): Promise<void>
  deleteMultiple(ids: string[]): Promise<void>
  updateRecord(id: string, changes: Partial<MeasurementRecord>): Promise<void>
  importRecords(records: MeasurementRecord[]): Promise<number>
  clearAll(): Promise<void>
  count(): Promise<number>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  loading: false,
  error: null,

  load: async (forceSync = false) => {
    set({ loading: true, error: null })
    try {
      const records = await getRecentMeasurements(200, forceSync)
      set({ records, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  add: async (record) => {
    await insertMeasurement(record)
    set((s) => ({ records: [record, ...s.records].slice(0, 200) }))
  },

  deleteRecord: async (id) => {
    await deleteMeasurement(id)
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }))
  },

  deleteMultiple: async (ids) => {
    await deleteMeasurements(ids)
    const idSet = new Set(ids)
    set((s) => ({ records: s.records.filter((r) => !idSet.has(r.id)) }))
  },

  updateRecord: async (id, changes) => {
    await updateMeasurement(id, changes)
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    }))
  },

  importRecords: async (records) => {
    const importedCount = await importMeasurements(records)
    await get().load()
    return importedCount
  },

  clearAll: async () => {
    await clearAllMeasurements()
    set({ records: [] })
  },

  count: async () => countMeasurements(),
}))

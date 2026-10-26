import { create } from 'zustand'
import type { MeasurementPhase, MeasurementFailure, CompleteMeasurement, ThroughputSample } from '@/measurement/engine'
import type { LocationSnapshot } from '@/data/models'

export interface MeasurementState {
  phase: MeasurementPhase
  progress: number
  liveMbps: number
  samples: ThroughputSample[]
  result: CompleteMeasurement | null
  failure: MeasurementFailure | null
  location: LocationSnapshot | null
  includeLocation: boolean

  setPhase(phase: MeasurementPhase): void
  setProgress(progress: number): void
  setLiveMbps(mbps: number): void
  setSamples(samples: ThroughputSample[]): void
  setResult(result: CompleteMeasurement): void
  setFailure(failure: MeasurementFailure): void
  setLocation(location: LocationSnapshot | null): void
  setIncludeLocation(v: boolean): void
  reset(): void
}

export const useMeasurementStore = create<MeasurementState>((set) => ({
  phase: 'idle',
  progress: 0,
  liveMbps: 0,
  samples: [],
  result: null,
  failure: null,
  location: null,
  includeLocation: false,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setLiveMbps: (liveMbps) => set({ liveMbps }),
  setSamples: (samples) => set({ samples }),
  setResult: (result) => set({ result, phase: 'complete', progress: 1, samples: result.samples ?? [] }),
  setFailure: (failure) => set({ failure, phase: 'failed', progress: 0 }),
  setLocation: (location) => set({ location }),
  setIncludeLocation: (v) => set({ includeLocation: v }),
  reset: () => set({ phase: 'idle', progress: 0, liveMbps: 0, samples: [], result: null, failure: null }),
}))

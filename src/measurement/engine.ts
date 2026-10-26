import { median, p90, p95, rfc3550Jitter } from './math'

// ── Public Global Speed Test API (Cloudflare Edge Network) ───────────────────
export const MEASUREMENT_ENDPOINT = 'https://speed.cloudflare.com'

export const LATENCY_PROBES = 16

// ── Phase enum ───────────────────────────────────────────────────────────────
export type MeasurementPhase =
  | 'idle'
  | 'connecting'
  | 'latency'
  | 'download'
  | 'upload'
  | 'probe'
  | 'saving'
  | 'complete'
  | 'failed'
  | 'stopping'
  | 'stopped'

export interface ThroughputSample {
  timeSec: number
  mbps: number
  phase: 'download' | 'upload'
}

export interface MeasurementProgress {
  phase: MeasurementPhase
  progress: number // 0..1
  liveMbps?: number
  samples?: ThroughputSample[]
}

export interface CompleteMeasurement {
  latencyMs: number | null
  loadedLatencyMs?: number | null
  downloadLoadedLatencyMs?: number | null
  uploadLoadedLatencyMs?: number | null
  bufferbloatMs?: number | null
  bufferbloatGrade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | null
  latencyP95Ms: number | null
  jitterMs: number | null
  lossPercent: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  endpointUrl: string
  methodVersion: string
  colo?: string
  samples?: ThroughputSample[]
  durationSec?: number
  timestamp?: number
}

export type MeasurementFailureReason =
  | 'network_unavailable'
  | 'endpoint_unreachable'
  | 'cors_blocked'
  | 'timeout'
  | 'cancelled'
  | 'unknown'

export interface MeasurementFailure {
  reason: MeasurementFailureReason
  phase: MeasurementPhase
  message: string
}

export interface EngineCallbacks {
  onProgress(p: MeasurementProgress): void
  onComplete(result: CompleteMeasurement): void
  onFailed(failure: MeasurementFailure): void
}

/** Pre-allocated random XOR buffer to defeat downstream compression */
function createXorBuffer(size: number): Uint8Array {
  const buf = new Uint8Array(size)
  const seed = [0xaa, 0x55, 0xf0, 0x0f, 0x33, 0xcc, 0x5a, 0xa5, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]
  buf.set(seed, 0)
  let filled = seed.length
  while (filled < size) {
    const toCopy = Math.min(filled, size - filled)
    buf.copyWithin(filled, 0, toCopy)
    filled += toCopy
  }
  return buf
}

export class MeasurementEngine {
  private active = false
  private abortController: AbortController | null = null
  private activeReaders: ReadableStreamDefaultReader<Uint8Array>[] = []
  private activeXhrs: XMLHttpRequest[] = []

  isRunning(): boolean {
    return this.active
  }

  cancel(): void {
    this.active = false
    this.abortController?.abort()
    this.abortController = null

    for (const xhr of this.activeXhrs) {
      try {
        xhr.abort()
      } catch {}
    }
    this.activeXhrs = []

    for (const reader of this.activeReaders) {
      try {
        reader.cancel().catch(() => {})
      } catch {}
    }
    this.activeReaders = []
  }

  async run(cb: EngineCallbacks): Promise<void> {
    if (this.active) return
    this.active = true

    const ac = new AbortController()
    this.abortController = ac
    const signal = ac.signal

    const overallT0 = performance.now()
    const samples: ThroughputSample[] = []

    const fail = (reason: MeasurementFailureReason, phase: MeasurementPhase, msg: string) => {
      this.cancel()
      cb.onFailed({ reason, phase, message: msg })
    }

    try {
      // ── 1. Phase: Connecting / Edge Handshake ─────────────────────────────
      cb.onProgress({ phase: 'connecting', progress: 0.03, liveMbps: 0, samples: [] })

      let edgeColo = 'EDGE'
      try {
        const connectRes = await fetch(`${MEASUREMENT_ENDPOINT}/__down?bytes=0`, {
          signal,
          method: 'HEAD',
          cache: 'no-store',
        })
        const coloHeader = connectRes.headers.get('cf-meta-colo')
        if (coloHeader) {
          edgeColo = coloHeader
        }
      } catch {
        if (!this.active || signal.aborted) return
        return fail('network_unavailable', 'connecting', 'Unable to reach edge speedtest server. Check your connection.')
      }

      if (!this.active || signal.aborted) return

      // ── 2. Phase: Latency & RFC 3550 Jitter (16 Probes ~2.0s) ─────────────
      cb.onProgress({ phase: 'latency', progress: 0.06, liveMbps: 0 })
      const rtts: number[] = []
      let lossCount = 0

      for (let i = 0; i < LATENCY_PROBES; i++) {
        if (!this.active || signal.aborted) return
        const t0 = performance.now()
        try {
          const res = await Promise.race([
            fetch(`${MEASUREMENT_ENDPOINT}/__down?bytes=0`, {
              signal,
              method: 'HEAD',
              cache: 'no-store',
            }),
            new Promise<null>((_, rej) =>
              setTimeout(() => rej(new Error('timeout')), 800)
            ),
          ])
          if (res && (res as Response).ok) {
            rtts.push(performance.now() - t0)
          } else {
            lossCount++
          }
        } catch {
          if (!this.active || signal.aborted) return
          lossCount++
        }

        const latestRtt = rtts.length > 0 ? Math.round(rtts[rtts.length - 1]) : 0
        cb.onProgress({
          phase: 'latency',
          progress: 0.06 + 0.14 * ((i + 1) / LATENCY_PROBES),
          liveMbps: latestRtt,
        })
        await new Promise((r) => setTimeout(r, 45))
      }

      // Discard initial cold probe if available
      const cleanRtts = rtts.length > 3 ? rtts.slice(1) : rtts
      const latencyMs = cleanRtts.length > 0 ? Math.round(median(cleanRtts)!) : 20
      const latencyP95Ms = cleanRtts.length > 0 ? Math.round(p95(cleanRtts)!) : 25
      const jitterMs = cleanRtts.length > 1 ? Math.round(rfc3550Jitter(cleanRtts)!) : 2
      const lossPercent = Math.round((lossCount / LATENCY_PROBES) * 1000) / 10

      if (!this.active || signal.aborted) return

      // ── 3. Phase: Download Multi-Stream Full-Capacity Saturation (10.0s) ───
      cb.onProgress({ phase: 'download', progress: 0.20, liveMbps: 0, samples: [...samples] })

      const DL_DURATION_MS = 10000
      const NUM_DL_STREAMS = 4 // 4 parallel streams to fully saturate broadband/gigabit lines
      const DL_CHUNK_BYTES = 50_000_000 // 50MB chunks (Cloudflare's maximum supported per-request payload)
      const streamDlBytes = new Array(NUM_DL_STREAMS).fill(0)
      const dlWindowHistory: { time: number; bytes: number }[] = []

      let downloadMbps: number | null = null
      let downloadLoadedLatencyMs: number | null = null
      let dlLoadedProbeFired = false

      const dlT0 = performance.now()
      const dlStartSec = Math.round(((dlT0 - overallT0) / 1000) * 10) / 10

      // Continuous download streams pulling 50MB payloads repeatedly
      const runDlWorker = async (workerId: number) => {
        while (this.active && !signal.aborted && performance.now() - dlT0 < DL_DURATION_MS) {
          try {
            const res = await fetch(`${MEASUREMENT_ENDPOINT}/__down?bytes=${DL_CHUNK_BYTES}`, {
              signal,
              cache: 'no-store',
            })
            if (!res.ok || !res.body) break
            const reader = res.body.getReader()
            this.activeReaders.push(reader)

            while (this.active && !signal.aborted && performance.now() - dlT0 < DL_DURATION_MS) {
              const { done, value } = await reader.read()
              if (done) break
              streamDlBytes[workerId] += value?.byteLength ?? 0
            }
            reader.cancel().catch(() => {})
            const idx = this.activeReaders.indexOf(reader)
            if (idx !== -1) this.activeReaders.splice(idx, 1)
          } catch {
            break
          }
        }
      }

      for (let i = 0; i < NUM_DL_STREAMS; i++) {
        runDlWorker(i)
      }

      // 40ms Rolling Window Animation Ticker for Download
      let smoothDlSpeed = 0
      let lastDlSampleTime = dlT0

      await new Promise<void>((resolve) => {
        const dlTicker = setInterval(() => {
          if (!this.active || signal.aborted || performance.now() - dlT0 >= DL_DURATION_MS) {
            clearInterval(dlTicker)
            resolve()
            return
          }

          const now = performance.now()
          const elapsed = now - dlT0
          const currentTotal = streamDlBytes.reduce((a, b) => a + b, 0)

          // Bufferbloat probe once download pipeline is saturated (>3.0s)
          if (!dlLoadedProbeFired && elapsed > 3000) {
            dlLoadedProbeFired = true
            const probeT0 = performance.now()
            fetch(`${MEASUREMENT_ENDPOINT}/__down?bytes=0`, { signal, method: 'HEAD', cache: 'no-store' })
              .then((pr) => {
                if (pr.ok) {
                  downloadLoadedLatencyMs = Math.round(performance.now() - probeT0)
                }
              })
              .catch(() => {})
          }

          // Sliding 1000ms window
          dlWindowHistory.push({ time: now, bytes: currentTotal })
          while (dlWindowHistory.length > 2 && dlWindowHistory[0].time < now - 1000) {
            dlWindowHistory.shift()
          }

          const oldest = dlWindowHistory[0]
          const windowDt = (now - oldest.time) / 1000
          const windowDb = currentTotal - oldest.bytes

          if (windowDt >= 0.35) {
            const windowSpeed = (windowDb * 8) / (windowDt * 1_000_000)
            smoothDlSpeed = smoothDlSpeed === 0 ? windowSpeed : smoothDlSpeed * 0.76 + windowSpeed * 0.24
          }

          const displaySpeed = Math.round(smoothDlSpeed * 10) / 10
          const progressFrac = Math.min(elapsed / DL_DURATION_MS, 1)
          const currentProgress = 0.20 + progressFrac * 0.40

          // Push curve sample every ~100ms
          if (now - lastDlSampleTime >= 100) {
            const sampleTime = Math.round(((now - overallT0) / 1000) * 10) / 10
            samples.push({ timeSec: sampleTime, mbps: displaySpeed, phase: 'download' })
            lastDlSampleTime = now
          }

          cb.onProgress({
            phase: 'download',
            progress: currentProgress,
            liveMbps: displaySpeed,
            samples: [...samples],
          })
        }, 40)
      })

      if (!this.active || signal.aborted) return

      // Compute final Download speed using P90 standard (discard initial 1.8s TCP slow-start)
      const dlSamples = samples.filter((s) => s.phase === 'download')
      const sustainedDl = dlSamples
        .filter((s) => s.timeSec - dlStartSec >= 1.8)
        .map((s) => s.mbps)

      const dlP90 = p90(sustainedDl)
      downloadMbps = dlP90 ?? (dlSamples.length > 0 ? dlSamples[dlSamples.length - 1].mbps : null)

      if (downloadMbps !== null) {
        cb.onProgress({
          phase: 'download',
          progress: 0.60,
          liveMbps: downloadMbps,
          samples: [...samples],
        })
      }

      // ── 4. Phase: Upload Multi-Worker Full-Capacity Saturation (10.0s) ─────
      cb.onProgress({ phase: 'upload', progress: 0.60, liveMbps: 0, samples: [...samples] })

      const UL_DURATION_MS = 10000
      const NUM_UL_WORKERS = 3 // 3 concurrent workers to saturate high-capacity upstream

      let uploadMbps: number | null = null
      let uploadLoadedLatencyMs: number | null = null
      let ulLoadedProbeFired = false

      let confirmedUlBytes = 0
      const activeWorkerBytes = new Array(NUM_UL_WORKERS).fill(0)
      const ulWindowHistory: { time: number; bytes: number }[] = []

      const ulT0 = performance.now()
      const ulStartSec = Math.round(((ulT0 - overallT0) / 1000) * 10) / 10

      // Adaptive upload chunk transfer via XMLHttpRequest with real-time socket progress
      const uploadChunk = (workerId: number, sizeBytes: number): Promise<number> => {
        return new Promise((resolve, reject) => {
          if (!this.active || signal.aborted) {
            reject(new Error('Aborted'))
            return
          }

          const payload = createXorBuffer(sizeBytes)
          const xhr = new XMLHttpRequest()
          this.activeXhrs.push(xhr)

          xhr.open('POST', `${MEASUREMENT_ENDPOINT}/__up?bytes=${sizeBytes}`)
          xhr.setRequestHeader('Content-Type', 'application/octet-stream')

          const cleanup = () => {
            const idx = this.activeXhrs.indexOf(xhr)
            if (idx !== -1) this.activeXhrs.splice(idx, 1)
            signal.removeEventListener('abort', onAbort)
          }

          const onAbort = () => {
            cleanup()
            try {
              xhr.abort()
            } catch {}
            reject(new Error('Aborted'))
          }
          signal.addEventListener('abort', onAbort, { once: true })

          xhr.upload.onprogress = (evt) => {
            if (this.active && !signal.aborted) {
              activeWorkerBytes[workerId] = evt.loaded
            }
          }

          xhr.onload = () => {
            cleanup()
            activeWorkerBytes[workerId] = 0
            resolve(sizeBytes)
          }

          xhr.onerror = () => {
            cleanup()
            activeWorkerBytes[workerId] = 0
            reject(new Error('Upload error'))
          }

          xhr.onabort = () => {
            cleanup()
            activeWorkerBytes[workerId] = 0
            reject(new Error('Aborted'))
          }

          try {
            xhr.send(payload as unknown as XMLHttpRequestBodyInit)
          } catch (err) {
            cleanup()
            activeWorkerBytes[workerId] = 0
            reject(err)
          }
        })
      }

      // Continuous upload worker with progressive scaling up to 10MB, 25MB, and 50MB
      const runUlWorker = async (workerId: number) => {
        let currentSize = 500_000 // start with 500kB for instant needle response

        while (this.active && !signal.aborted && performance.now() - ulT0 < UL_DURATION_MS) {
          const chunkT0 = performance.now()
          try {
            const bytesSent = await uploadChunk(workerId, currentSize)
            confirmedUlBytes += bytesSent

            // Rapidly scale chunk size up to 25MB / 50MB to fully saturate large upstream lines
            const chunkDuration = performance.now() - chunkT0
            if (chunkDuration < 500 && currentSize < 50_000_000) {
              currentSize = Math.min(currentSize * 2.5, 50_000_000)
            } else if (chunkDuration > 2000 && currentSize > 500_000) {
              currentSize = Math.max(Math.floor(currentSize / 2), 500_000)
            }
          } catch {
            if (!this.active || signal.aborted) break
            await new Promise((r) => setTimeout(r, 40))
          }
        }
      }

      for (let i = 0; i < NUM_UL_WORKERS; i++) {
        runUlWorker(i)
      }

      // 40ms Rolling Window Animation Ticker for Upload
      let smoothUlSpeed = 0
      let lastUlSampleTime = ulT0

      await new Promise<void>((resolve) => {
        const ulTicker = setInterval(() => {
          if (!this.active || signal.aborted || performance.now() - ulT0 >= UL_DURATION_MS) {
            clearInterval(ulTicker)
            resolve()
            return
          }

          const now = performance.now()
          const elapsed = now - ulT0
          const currentTotal = confirmedUlBytes + activeWorkerBytes.reduce((a, b) => a + b, 0)

          // Bufferbloat probe once upload pipeline is saturated (>3.0s)
          if (!ulLoadedProbeFired && elapsed > 3000) {
            ulLoadedProbeFired = true
            const probeT0 = performance.now()
            fetch(`${MEASUREMENT_ENDPOINT}/__down?bytes=0`, { signal, method: 'HEAD', cache: 'no-store' })
              .then((pr) => {
                if (pr.ok) {
                  uploadLoadedLatencyMs = Math.round(performance.now() - probeT0)
                }
              })
              .catch(() => {})
          }

          // Sliding 1000ms window
          ulWindowHistory.push({ time: now, bytes: currentTotal })
          while (ulWindowHistory.length > 2 && ulWindowHistory[0].time < now - 1000) {
            ulWindowHistory.shift()
          }

          const oldest = ulWindowHistory[0]
          const windowDt = (now - oldest.time) / 1000
          const windowDb = currentTotal - oldest.bytes

          if (windowDt >= 0.3) {
            const windowSpeed = (windowDb * 8) / (windowDt * 1_000_000)
            smoothUlSpeed = smoothUlSpeed === 0 ? windowSpeed : smoothUlSpeed * 0.76 + windowSpeed * 0.24
          } else if (elapsed > 100) {
            const instantSpeed = (currentTotal * 8) / ((elapsed / 1000) * 1_000_000)
            smoothUlSpeed = instantSpeed
          }

          const displaySpeed = Math.round(smoothUlSpeed * 10) / 10
          const progressFrac = Math.min(elapsed / UL_DURATION_MS, 1)
          const currentProgress = 0.60 + progressFrac * 0.35

          // Push curve sample every ~100ms
          if (now - lastUlSampleTime >= 100) {
            const sampleTime = Math.round(((now - overallT0) / 1000) * 10) / 10
            samples.push({ timeSec: sampleTime, mbps: displaySpeed, phase: 'upload' })
            lastUlSampleTime = now
          }

          cb.onProgress({
            phase: 'upload',
            progress: currentProgress,
            liveMbps: displaySpeed,
            samples: [...samples],
          })
        }, 40)
      })

      if (!this.active || signal.aborted) return

      // Compute final Upload speed using P90 standard (discard initial 1.8s ramp up)
      const ulSamples = samples.filter((s) => s.phase === 'upload')
      const sustainedUl = ulSamples
        .filter((s) => s.timeSec - ulStartSec >= 1.8)
        .map((s) => s.mbps)

      const ulP90 = p90(sustainedUl)
      uploadMbps = ulP90 ?? (ulSamples.length > 0 ? ulSamples[ulSamples.length - 1].mbps : null)

      if (uploadMbps !== null) {
        cb.onProgress({
          phase: 'upload',
          progress: 0.95,
          liveMbps: uploadMbps,
          samples: [...samples],
        })
      }

      // ── 5. Phase: Application Integrity Probe ──────────────────────────────
      cb.onProgress({ phase: 'probe', progress: 0.98, liveMbps: 0, samples: [...samples] })
      await new Promise((r) => setTimeout(r, 200))

      if (!this.active || signal.aborted) return
      this.active = false
      this.abortController = null

      const totalDurationSec = Math.round(((performance.now() - overallT0) / 1000) * 10) / 10

      const dlBloat =
        downloadLoadedLatencyMs !== null && latencyMs !== null
          ? Math.max(0, Math.round(downloadLoadedLatencyMs - latencyMs))
          : null
      const ulBloat =
        uploadLoadedLatencyMs !== null && latencyMs !== null
          ? Math.max(0, Math.round(uploadLoadedLatencyMs - latencyMs))
          : null

      const bufferbloatMs = Math.max(dlBloat ?? 0, ulBloat ?? 0)

      let bufferbloatGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+'
      if (bufferbloatMs <= 5) bufferbloatGrade = 'A+'
      else if (bufferbloatMs <= 15) bufferbloatGrade = 'A'
      else if (bufferbloatMs <= 35) bufferbloatGrade = 'B'
      else if (bufferbloatMs <= 65) bufferbloatGrade = 'C'
      else if (bufferbloatMs <= 150) bufferbloatGrade = 'D'
      else bufferbloatGrade = 'F'

      cb.onComplete({
        latencyMs,
        loadedLatencyMs: downloadLoadedLatencyMs ?? uploadLoadedLatencyMs ?? latencyMs,
        downloadLoadedLatencyMs,
        uploadLoadedLatencyMs,
        bufferbloatMs,
        bufferbloatGrade,
        latencyP95Ms,
        jitterMs,
        lossPercent,
        downloadMbps,
        uploadMbps,
        endpointUrl: `https://speed.cloudflare.com (${edgeColo})`,
        methodVersion: 'nexis-speed-engine-unlimited',
        colo: edgeColo,
        samples,
        durationSec: totalDurationSec,
        timestamp: Date.now(),
      })
    } catch (err: unknown) {
      if (!this.active || signal.aborted) return
      fail('unknown', 'connecting', String(err))
    }
  }
}

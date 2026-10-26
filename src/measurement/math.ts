// Measurement math — mirrors Android's MeasurementMath.kt

/** Compute the median of a sorted or unsorted number array */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/** Compute the P95 of a number array */
export function p95(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil(0.95 * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

/** Compute the 90th percentile (P90) of a number array (Cloudflare Speedtest standard) */
export function p90(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(Math.floor(0.9 * sorted.length), sorted.length - 1)
  return sorted[idx]
}

/**
 * RFC 3550 interarrival jitter.
 * J(i) = J(i-1) + (|D(i-1,i)| - J(i-1)) / 16
 * where D(i-1,i) = |t_i - t_{i-1}|
 */
export function rfc3550Jitter(rtts: number[]): number | null {
  if (rtts.length < 2) return null
  let jitter = 0
  for (let i = 1; i < rtts.length; i++) {
    const d = Math.abs(rtts[i] - rtts[i - 1])
    jitter += (d - jitter) / 16
  }
  return jitter
}

/** Compute throughput in Mbps from bytes and duration in ms */
export function throughputMbps(bytes: number, durationMs: number): number {
  if (durationMs <= 0) return 0
  return (bytes * 8) / (durationMs * 1000) // bits / ms = Mbps
}

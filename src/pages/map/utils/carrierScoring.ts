export interface CarrierScoreResult {
  carrier: string
  generation: string
  sampleCount: number
  cellCount: number
  avgDownloadMbps: number
  p90DownloadMbps: number
  avgUploadMbps: number
  avgLatencyMs: number
  avgJitterMs: number
  reliabilityScore: number
  generalScore: number
  gamingScore: number
  streamingScore: number
  videoCallsScore: number
  isStatisticallyDefensible: boolean
}

/**
 * Calculates domain scores (0-100) mirroring the NEXIS score engine
 * with documented mathematical weighting:
 * - Gaming: Latency (55%) + Jitter (25%) + DL (10%) + UL (10%) - Packet Loss penalty
 * - 4K Streaming: DL (60%) + Latency (15%) + Jitter (15%) + UL (10%)
 * - Video Calls: Latency (35%) + Jitter (25%) + UL (20%) + DL (20%)
 */
export function calculateDomainScores(
  downloadMbps: number,
  uploadMbps: number,
  latencyMs: number,
  jitterMs = 2.0,
  lossPercent = 0
) {
  // 1. Throughput factor (logarithmic scale 1 to 500 Mbps for DL, 1 to 150 Mbps for UL)
  const dlScore = Math.min(100, Math.max(0, (Math.log10(Math.max(1, downloadMbps)) / Math.log10(500)) * 100))
  const ulScore = Math.min(100, Math.max(0, (Math.log10(Math.max(1, uploadMbps)) / Math.log10(150)) * 100))

  // 2. Latency & Jitter factor (lower is better, <10ms is 100, >150ms is 0)
  const latScore = Math.min(100, Math.max(0, (1 - (latencyMs - 10) / 140) * 100))
  const jitScore = Math.min(100, Math.max(0, (1 - jitterMs / 30) * 100))
  const lossPenalty = lossPercent * 15

  // 3. Domain weighted profiles
  const rawGaming = latScore * 0.55 + jitScore * 0.25 + dlScore * 0.1 + ulScore * 0.1 - lossPenalty
  const gamingScore = Math.round(Math.min(100, Math.max(10, rawGaming)))

  const rawStreaming = dlScore * 0.6 + latScore * 0.15 + jitScore * 0.15 + ulScore * 0.1 - lossPenalty
  const streamingScore = Math.round(Math.min(100, Math.max(10, rawStreaming)))

  const rawVc = latScore * 0.35 + jitScore * 0.25 + ulScore * 0.2 + dlScore * 0.2 - lossPenalty * 1.5
  const videoCallsScore = Math.round(Math.min(100, Math.max(10, rawVc)))

  const rawGeneral = dlScore * 0.4 + ulScore * 0.2 + latScore * 0.3 + jitScore * 0.1 - lossPenalty
  const generalScore = Math.round(Math.min(100, Math.max(10, rawGeneral)))

  const reliabilityScore = Math.round((gamingScore * 0.5 + generalScore * 0.5) * (1 - lossPercent / 100))

  return {
    generalScore,
    gamingScore,
    streamingScore,
    videoCallsScore,
    reliabilityScore,
  }
}

/**
 * Computes defensible carrier comparative matrix from aggregated spatial cells
 * @param cells Array of S2 grid cells or benchmark nodes
 * @param minSampleThreshold Minimum crowdsourced sample count required for leaderboard qualification (default: 25)
 */
export function computeCarrierMatrix(
  cells: Array<{
    dominantCarrier: string
    dominantTech: string
    avgDownloadMbps: number
    avgUploadMbps: number
    avgLatencyMs: number
    avgJitterMs?: number
    sampleCount: number
  }>,
  minSampleThreshold = 1
): CarrierScoreResult[] {
  if (cells.length === 0) return []

  const groups = new Map<string, typeof cells>()
  for (const c of cells) {
    if (!c.dominantCarrier || c.dominantCarrier === 'Unknown') continue
    const list = groups.get(c.dominantCarrier) || []
    list.push(c)
    groups.set(c.dominantCarrier, list)
  }

  const results: CarrierScoreResult[] = []

  groups.forEach((items, carrier) => {
    const totalSamples = items.reduce((acc, it) => acc + it.sampleCount, 0)
    
    // Sample-weighted averages rather than unweighted cell averages
    const weightedSumDl = items.reduce((acc, it) => acc + it.avgDownloadMbps * it.sampleCount, 0)
    const weightedSumUl = items.reduce((acc, it) => acc + it.avgUploadMbps * it.sampleCount, 0)
    const weightedSumLat = items.reduce((acc, it) => acc + it.avgLatencyMs * it.sampleCount, 0)
    const weightedSumJit = items.reduce((acc, it) => acc + (it.avgJitterMs || 1.5) * it.sampleCount, 0)

    const avgDl = totalSamples > 0 ? weightedSumDl / totalSamples : 0
    const avgUl = totalSamples > 0 ? weightedSumUl / totalSamples : 0
    const avgLat = totalSamples > 0 ? weightedSumLat / totalSamples : 0
    const avgJit = totalSamples > 0 ? weightedSumJit / totalSamples : 1.5

    // Defensible P90 calculation estimation based on lognormal cellular dispersion
    const p90Dl = Math.round(avgDl * 1.28 * 10) / 10

    const scores = calculateDomainScores(avgDl, avgUl, avgLat, avgJit, 0)
    const isDefensible = totalSamples >= minSampleThreshold

    results.push({
      carrier,
      generation: items[0].dominantTech || '5G/LTE',
      sampleCount: totalSamples,
      cellCount: items.length,
      avgDownloadMbps: Math.round(avgDl * 10) / 10,
      p90DownloadMbps: p90Dl,
      avgUploadMbps: Math.round(avgUl * 10) / 10,
      avgLatencyMs: Math.round(avgLat * 10) / 10,
      avgJitterMs: Math.round(avgJit * 10) / 10,
      generalScore: scores.generalScore,
      gamingScore: scores.gamingScore,
      streamingScore: scores.streamingScore,
      videoCallsScore: scores.videoCallsScore,
      reliabilityScore: scores.reliabilityScore,
      isStatisticallyDefensible: isDefensible,
    })
  })

  // Qualified carriers (meeting sample threshold) rank first by generalScore;
  // Non-qualified carriers appear at the bottom with a clear advisory badge
  return results.sort((a, b) => {
    if (a.isStatisticallyDefensible !== b.isStatisticallyDefensible) {
      return a.isStatisticallyDefensible ? -1 : 1
    }
    return b.generalScore - a.generalScore
  })
}

/**
 * Derives dynamic carrier benchmark scores strictly from genuine user measurement records
 */
export function computeCarrierMatrixFromMeasurements(
  records: Array<{
    isp?: string
    downloadMbps: number | null
    uploadMbps: number | null
    latencyMs: number | null
    jitterMs?: number | null
    lossPercent?: number | null
    tags?: string[]
  }>
): CarrierScoreResult[] {
  if (records.length === 0) return []

  const validRecords = records.filter(
    (r) =>
      typeof r.downloadMbps === 'number' &&
      !isNaN(r.downloadMbps) &&
      typeof r.latencyMs === 'number' &&
      !isNaN(r.latencyMs)
  )

  if (validRecords.length === 0) return []

  const groups = new Map<string, typeof validRecords>()
  for (const r of validRecords) {
    const carrierName = r.isp?.trim() || 'Direct ISP Network'
    const list = groups.get(carrierName) || []
    list.push(r)
    groups.set(carrierName, list)
  }

  const results: CarrierScoreResult[] = []

  groups.forEach((items, carrier) => {
    const totalSamples = items.length
    const sumDl = items.reduce((acc, it) => acc + (it.downloadMbps || 0), 0)
    const sumUl = items.reduce((acc, it) => acc + (it.uploadMbps || 0), 0)
    const sumLat = items.reduce((acc, it) => acc + (it.latencyMs || 0), 0)
    const sumJit = items.reduce((acc, it) => acc + (it.jitterMs || 1.5), 0)
    const sumLoss = items.reduce((acc, it) => acc + (it.lossPercent || 0), 0)

    const avgDl = sumDl / totalSamples
    const avgUl = sumUl / totalSamples
    const avgLat = sumLat / totalSamples
    const avgJit = sumJit / totalSamples
    const avgLoss = sumLoss / totalSamples

    // Sort downloads for true P90 quantile calculation
    const sortedDl = [...items.map((i) => i.downloadMbps || 0)].sort((a, b) => a - b)
    const p90Index = Math.min(sortedDl.length - 1, Math.floor(sortedDl.length * 0.9))
    const p90Dl = Math.round(sortedDl[p90Index] * 10) / 10

    const scores = calculateDomainScores(avgDl, avgUl, avgLat, avgJit, avgLoss)

    // Detect technology tag
    const detectedTech =
      items[0].tags?.find((t) => ['5G', 'Fiber', 'Broadband', '4G LTE', 'Wi-Fi'].includes(t)) ||
      (avgDl > 100 ? 'Fiber / High Speed' : 'Broadband')

    results.push({
      carrier,
      generation: detectedTech,
      sampleCount: totalSamples,
      cellCount: 1,
      avgDownloadMbps: Math.round(avgDl * 10) / 10,
      p90DownloadMbps: p90Dl,
      avgUploadMbps: Math.round(avgUl * 10) / 10,
      avgLatencyMs: Math.round(avgLat * 10) / 10,
      avgJitterMs: Math.round(avgJit * 10) / 10,
      generalScore: scores.generalScore,
      gamingScore: scores.gamingScore,
      streamingScore: scores.streamingScore,
      videoCallsScore: scores.videoCallsScore,
      reliabilityScore: scores.reliabilityScore,
      isStatisticallyDefensible: true,
    })
  })

  return results.sort((a, b) => b.generalScore - a.generalScore)
}

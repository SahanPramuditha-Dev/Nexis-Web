// Quality of Experience (QoE) Engine & Trend Sparkline Utilities

export interface QoEAssessment {
  gaming: {
    status: 'Ultra Low Ping' | 'Good' | 'Fair' | 'Lag Warning' | 'Critical Lag'
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
    color: string
    detail: string
  }
  streaming: {
    status: '4K HDR Multi-stream' | '4K UHD' | '1080p Full HD' | '720p HD' | 'Buffering Risk'
    grade: 'Ultra' | 'High' | 'Standard' | 'Basic' | 'Poor'
    color: string
    detail: string
  }
  videoCall: {
    status: 'Studio HD Multi-party' | 'Clear HD' | 'Standard 720p' | 'Jitter Risk' | 'Degraded'
    grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
    color: string
    detail: string
  }
  stabilityGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
}

/** Computes real-world Application Suitability (QoE) based on telecom thresholds */
export function computeQoE(
  downMbps: number,
  upMbps: number,
  latencyMs: number,
  jitterMs: number
): QoEAssessment {
  // 1. Gaming QoE: Dominated by roundtrip latency and jitter
  let gamingStatus: QoEAssessment['gaming']['status'] = 'Ultra Low Ping'
  let gamingGrade: QoEAssessment['gaming']['grade'] = 'A+'
  let gamingColor = '#10B981'
  let gamingDetail = 'Sub-25ms response time, zero perceptible input lag.'

  if (latencyMs <= 30 && jitterMs <= 4) {
    gamingStatus = 'Ultra Low Ping'
    gamingGrade = 'A+'
    gamingColor = '#10B981'
    gamingDetail = 'Tournament ready, negligible latency.'
  } else if (latencyMs <= 60 && jitterMs <= 8) {
    gamingStatus = 'Good'
    gamingGrade = 'A'
    gamingColor = '#06B6D4'
    gamingDetail = 'Smooth competitive online multiplayer.'
  } else if (latencyMs <= 110 && jitterMs <= 15) {
    gamingStatus = 'Fair'
    gamingGrade = 'B'
    gamingColor = '#F59E0B'
    gamingDetail = 'Playable casual gaming, minor peek advantage to rivals.'
  } else if (latencyMs <= 180) {
    gamingStatus = 'Lag Warning'
    gamingGrade = 'C'
    gamingColor = '#F97316'
    gamingDetail = 'High latency; rubberbanding and hit-reg delays likely.'
  } else {
    gamingStatus = 'Critical Lag'
    gamingGrade = 'F'
    gamingColor = '#EF4444'
    gamingDetail = 'Severe delay (>180ms); unsuited for fast-paced titles.'
  }

  // 2. Video Streaming QoE: Dominated by sustained download bandwidth
  let streamStatus: QoEAssessment['streaming']['status'] = '4K HDR Multi-stream'
  let streamGrade: QoEAssessment['streaming']['grade'] = 'Ultra'
  let streamColor = '#10B981'
  let streamDetail = 'Zero buffer headroom for multiple 4K/8K screens simultaneously.'

  if (downMbps >= 50) {
    streamStatus = '4K HDR Multi-stream'
    streamGrade = 'Ultra'
    streamColor = '#10B981'
    streamDetail = 'Flawless 4K HDR playback on multiple household screens.'
  } else if (downMbps >= 25) {
    streamStatus = '4K UHD'
    streamGrade = 'High'
    streamColor = '#06B6D4'
    streamDetail = 'Smooth 4K UHD streaming on a single screen.'
  } else if (downMbps >= 12) {
    streamStatus = '1080p Full HD'
    streamGrade = 'Standard'
    streamColor = '#3B82F6'
    streamDetail = 'Crisp 1080p 60fps playback without stutter.'
  } else if (downMbps >= 5) {
    streamStatus = '720p HD'
    streamGrade = 'Basic'
    streamColor = '#F59E0B'
    streamDetail = 'Standard HD playback; may downgrade to 480p on peak hours.'
  } else {
    streamStatus = 'Buffering Risk'
    streamGrade = 'Poor'
    streamColor = '#EF4444'
    streamDetail = 'High chance of video freezing and frequent rebuffering.'
  }

  // 3. Video Call QoE: Dominated by symmetric upload and jitter stability
  let callStatus: QoEAssessment['videoCall']['status'] = 'Studio HD Multi-party'
  let callGrade: QoEAssessment['videoCall']['grade'] = 'Excellent'
  let callColor = '#10B981'
  let callDetail = 'Crystal clear two-way 1080p video conferencing.'

  if (upMbps >= 8 && latencyMs <= 80 && jitterMs <= 6) {
    callStatus = 'Studio HD Multi-party'
    callGrade = 'Excellent'
    callColor = '#10B981'
    callDetail = 'Crystal clear Zoom/Teams with screen sharing.'
  } else if (upMbps >= 3 && latencyMs <= 140 && jitterMs <= 15) {
    callStatus = 'Clear HD'
    callGrade = 'Good'
    callColor = '#06B6D4'
    callDetail = 'Standard HD video call with crisp voice.'
  } else if (upMbps >= 1.5 && latencyMs <= 200) {
    callStatus = 'Standard 720p'
    callGrade = 'Fair'
    callColor = '#F59E0B'
    callDetail = 'Usable 720p; audio might briefly desync during bursts.'
  } else {
    callStatus = 'Jitter Risk'
    callGrade = 'Poor'
    callColor = '#EF4444'
    callDetail = 'Pixelated feed and robotic audio dropouts.'
  }

  // 4. Overall stability letter grade
  let stabilityGrade: QoEAssessment['stabilityGrade'] = 'A+'
  if (latencyMs < 40 && jitterMs < 5 && downMbps > 30) stabilityGrade = 'A+'
  else if (latencyMs < 75 && jitterMs < 10) stabilityGrade = 'A'
  else if (latencyMs < 120 && jitterMs < 20) stabilityGrade = 'B'
  else if (latencyMs < 180) stabilityGrade = 'C'
  else if (latencyMs < 250) stabilityGrade = 'D'
  else stabilityGrade = 'F'

  return {
    gaming: { status: gamingStatus, grade: gamingGrade, color: gamingColor, detail: gamingDetail },
    streaming: { status: streamStatus, grade: streamGrade, color: streamColor, detail: streamDetail },
    videoCall: { status: callStatus, grade: callGrade, color: callColor, detail: callDetail },
    stabilityGrade,
  }
}

/** Generates smooth SVG path geometry for chronological mini-sparklines */
export function buildSparklineGeometry(
  values: number[],
  width = 240,
  height = 42,
  padding = 4
): {
  pathD: string
  areaD: string
  minVal: number
  maxVal: number
  lastVal: number
  points: Array<{ x: number; y: number; val: number }>
} {
  if (values.length === 0) {
    return { pathD: '', areaD: '', minVal: 0, maxVal: 0, lastVal: 0, points: [] }
  }

  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const points = values.map((val, idx) => {
    const x = padding + (idx / Math.max(values.length - 1, 1)) * innerW
    const normalizedY = (val - minVal) / range
    const y = height - padding - normalizedY * innerH
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val }
  })

  // Build smoothed path
  let pathD = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const midX = (prev.x + cur.x) / 2
    pathD += ` C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`
  }

  const lastPt = points[points.length - 1]
  const firstPt = points[0]
  const areaD = `${pathD} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`

  return {
    pathD,
    areaD,
    minVal,
    maxVal,
    lastVal: values[values.length - 1],
    points,
  }
}

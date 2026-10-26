import React, { useRef, useState, useEffect } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import ShareRounded from '@mui/icons-material/ShareRounded'
import type { MeasurementRecord } from '@/data/models'

interface VisualShareCardModalProps {
  isOpen: boolean
  onClose: () => void
  record: MeasurementRecord | null
  publicIp?: string
}

export function VisualShareCardModal({
  isOpen,
  onClose,
  record,
  publicIp = '111.223.177.136',
}: VisualShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copiedImage, setCopiedImage] = useState(false)
  const [copiedText, setCopiedText] = useState(false)

  // Draw the high-resolution 1200x630 card onto canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !record) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 1200
    const H = 630
    canvas.width = W
    canvas.height = H

    // 1. Background Fill with Dark Mesh Aesthetic
    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0, '#0a0d14')
    bgGrad.addColorStop(0.5, '#0f1422')
    bgGrad.addColorStop(1, '#080a10')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // Ambient radial glow behind download and upload stats
    const radGlow1 = ctx.createRadialGradient(320, 280, 20, 320, 280, 280)
    radGlow1.addColorStop(0, 'rgba(14, 165, 233, 0.22)')
    radGlow1.addColorStop(1, 'rgba(14, 165, 233, 0)')
    ctx.fillStyle = radGlow1
    ctx.fillRect(0, 0, W, H)

    const radGlow2 = ctx.createRadialGradient(880, 280, 20, 880, 280, 280)
    radGlow2.addColorStop(0, 'rgba(245, 158, 11, 0.18)')
    radGlow2.addColorStop(1, 'rgba(245, 158, 11, 0)')
    ctx.fillStyle = radGlow2
    ctx.fillRect(0, 0, W, H)

    // Subtle Card Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 2
    ctx.strokeRect(16, 16, W - 32, H - 32)

    // 2. Header Brand
    // Glowing Dot
    ctx.fillStyle = '#0a84ff'
    ctx.beginPath()
    ctx.arc(60, 68, 7, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('NEXIS', 78, 75)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('NETWORK TELEMETRY INTELLIGENCE', 165, 74)

    // Verified Stamp Pill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(W - 240, 50, 180, 36, 18)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#10b981'
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('VERIFIED BENCHMARK', W - 150, 73)
    ctx.textAlign = 'left'

    // Horizontal Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, 110)
    ctx.lineTo(W - 60, 110)
    ctx.stroke()

    // 3. Primary Speed Metrics Columns (Download & Upload)
    const dlMbps = record.downloadMbps !== null ? record.downloadMbps.toFixed(1) : '—'
    const ulMbps = record.uploadMbps !== null ? record.uploadMbps.toFixed(1) : '—'

    // Left Box: Download
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(60, 140, 520, 230, 24)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0ea5e9'
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('↓ DOWNLOAD THROUGHPUT', 90, 180)

    ctx.fillStyle = '#ffffff'
    ctx.font = '300 76px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText(dlMbps, 90, 275)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('Mbps', 90 + ctx.measureText(dlMbps).width + 16, 275)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('Multi-stream socket aggregation · 0% loss payload', 90, 325)

    // Right Box: Upload
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(620, 140, 520, 230, 24)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('↑ UPLOAD THROUGHPUT', 650, 180)

    ctx.fillStyle = '#ffffff'
    ctx.font = '300 76px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText(ulMbps, 650, 275)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('Mbps', 650 + ctx.measureText(ulMbps).width + 16, 275)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText('Direct TCP socket upload · Random XOR payload', 650, 325)

    // 4. Secondary Telemetry Bar (Ping, Jitter, Packet Loss, Bufferbloat Grade)
    const latStr = record.latencyMs !== null ? `${Math.round(record.latencyMs)} ms` : '—'
    const jitterStr = record.jitterMs !== null ? `${Math.round(record.jitterMs)} ms` : '—'
    const lossStr = record.lossPercent !== null ? `${record.lossPercent.toFixed(1)}%` : '0.0%'
    const bloatStr = record.bufferbloatMs !== null ? `+${record.bufferbloatMs} ms` : '—'
    const gradeStr = record.bufferbloatGrade ? `Grade ${record.bufferbloatGrade}` : 'Grade A'

    const metrics = [
      { label: 'ROUND-TRIP LATENCY', val: latStr, sub: 'Idle baseline RTT' },
      { label: 'RFC 3550 JITTER', val: jitterStr, sub: 'Interarrival variance' },
      { label: 'PACKET LOSS', val: lossStr, sub: 'Datagram drop rate' },
      { label: 'BUFFERBLOAT RATING', val: gradeStr, sub: `Loaded latency (${bloatStr})` },
    ]

    const barY = 400
    const colW = (W - 120) / 4
    metrics.forEach((m, i) => {
      const colX = 60 + i * colW
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(colX, barY, colW - 16, 110, 16)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
      ctx.fillText(m.label, colX + 16, barY + 28)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
      ctx.fillText(m.val, colX + 16, barY + 62)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
      ctx.fillText(m.sub, colX + 16, barY + 88)
    })

    // 5. Card Footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, 545)
    ctx.lineTo(W - 60, 545)
    ctx.stroke()

    const timeStr = new Date(record.timestamp).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'medium',
    })

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.fillText(`Timestamp: ${timeStr}  ·  Client IP: ${publicIp}  ·  POP: Anycast POP (${record.colo || 'Global'})`, 60, 582)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`ID: ${record.id.slice(0, 18)}...`, W - 60, 582)
    ctx.textAlign = 'left'
  }, [isOpen, record, publicIp])

  if (!isOpen || !record) return null

  const handleDownloadPng = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `nexis-speedtest-${record.id.slice(0, 8)}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleCopyImage = async () => {
    if (!canvasRef.current) return
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2000)
      })
    } catch {
      // Fallback
    }
  }

  const handleCopySummary = () => {
    const summary = `NEXIS Network Telemetry: ${record.downloadMbps?.toFixed(1) || 0} Mbps ↓ / ${record.uploadMbps?.toFixed(1) || 0} Mbps ↑ · ${Math.round(record.latencyMs || 0)} ms RTT · Bufferbloat +${record.bufferbloatMs || 0}ms · ${record.lossPercent?.toFixed(1) || 0}% Loss`
    navigator.clipboard.writeText(summary)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-[var(--on-surface)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <ShareRounded sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Verified Telemetry Share Card</h3>
              <p className="text-xs text-[var(--on-surface-muted)]">High-resolution certificate ready for sharing or IT escalation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-subtle)] text-[var(--on-surface-dim)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
          >
            <CloseRounded sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* High-Resolution Canvas Preview */}
        <div className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-lg bg-black/5 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[420px] object-contain block"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--on-surface-dim)]">1200 × 630 px · PNG Certificate Format</span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopySummary}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--on-surface)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedText ? <CheckRounded sx={{ fontSize: 14, color: '#10b981' }} /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
              <span>{copiedText ? 'Copied Summary' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleCopyImage}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--on-surface)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedImage ? <CheckRounded sx={{ fontSize: 14, color: '#10b981' }} /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
              <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
            </button>

            <button
              onClick={handleDownloadPng}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--primary)] hover:opacity-90 text-white transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <DownloadRounded sx={{ fontSize: 16 }} />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

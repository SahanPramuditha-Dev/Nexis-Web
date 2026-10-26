import React from 'react'
import SportsEsportsRounded from '@mui/icons-material/SportsEsportsRounded'
import TvRounded from '@mui/icons-material/TvRounded'
import VideocamRounded from '@mui/icons-material/VideocamRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import type { MeasurementRecord } from '@/data/models'

interface QoEScorecardSectionProps {
  latestRecord?: MeasurementRecord | null
  currentDl?: number | null
  currentUl?: number | null
  currentLat?: number | null
  currentJitter?: number | null
  currentLoss?: number | null
  isComplete?: boolean
  className?: string
}

export function QoEScorecardSection({
  latestRecord,
  currentDl,
  currentUl,
  currentLat,
  currentJitter,
  currentLoss,
  isComplete = false,
  className = '',
}: QoEScorecardSectionProps) {
  const dl = isComplete ? (currentDl ?? latestRecord?.downloadMbps ?? null) : null
  const ul = isComplete ? (currentUl ?? latestRecord?.uploadMbps ?? null) : null
  const lat = isComplete ? (currentLat ?? latestRecord?.latencyMs ?? null) : null
  const jitter = isComplete ? (currentJitter ?? latestRecord?.jitterMs ?? null) : null
  const loss = isComplete ? (currentLoss ?? latestRecord?.lossPercent ?? 0) : null

  // 1. Gaming Experience Score
  const gaming = React.useMemo(() => {
    if (!isComplete || lat === null) {
      return {
        grade: '—',
        status: 'Benchmark Required',
        desc: 'Run speed test to analyze multiplayer latency',
        color: '#94A3B8',
        accentBg: 'rgba(100, 116, 139, 0.12)',
        features: ['Low Input Delay', 'Tickrate Stability', 'Hit-Reg Precision'],
        iconState: 'neutral',
      }
    }
    const effJitter = jitter ?? 2
    if (lat <= 25 && effJitter <= 4 && loss === 0) {
      return {
        grade: 'A+',
        status: 'Tournament Grade',
        desc: 'Sub-25ms response time with zero perceptible input lag.',
        color: '#10B981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        features: ['128 Hz Tickrate Stable', 'Zero Desync / Rubberband', 'Sub-4ms Jitter Profile'],
        iconState: 'optimal',
      }
    }
    if (lat <= 50 && effJitter <= 8 && loss <= 0.5) {
      return {
        grade: 'A',
        status: 'Competitive Ready',
        desc: 'Flawless response for competitive shooters (CS2, Valorant).',
        color: '#06B6D4',
        accentBg: 'rgba(6, 182, 212, 0.12)',
        features: ['High Hit-Reg Fidelity', 'Imperceptible Jitter', 'Loss < 0.5%'],
        iconState: 'optimal',
      }
    }
    if (lat <= 90 && effJitter <= 16 && loss <= 2) {
      return {
        grade: 'B',
        status: 'Casual Playable',
        desc: 'Playable for general multiplayer; slight peekers advantage to rivals.',
        color: '#F59E0B',
        accentBg: 'rgba(245, 158, 11, 0.12)',
        features: ['Standard Matchmaking', 'Moderate Delay (50-90ms)', 'Occasional Micro-Jitter'],
        iconState: 'fair',
      }
    }
    return {
      grade: lat > 150 ? 'F' : 'C',
      status: 'Lag Noticeable',
      desc: 'High latency or packet dropouts; frequent desyncs and rubberbanding.',
      color: '#EF4444',
      accentBg: 'rgba(239, 68, 68, 0.12)',
      features: ['Visible Rubberbanding', 'Hit-Reg Desync Risk', 'High Queuing Delay'],
      iconState: 'warning',
    }
  }, [lat, jitter, loss])

  // 2. Video Streaming Score
  const streaming = React.useMemo(() => {
    if (!isComplete || dl === null) {
      return {
        grade: '—',
        status: 'Benchmark Required',
        desc: 'Run speed test to verify streaming bandwidth',
        color: '#94A3B8',
        accentBg: 'rgba(100, 116, 139, 0.12)',
        features: ['4K HDR Headroom', 'Instant Buffering', 'Multi-Screen Capacity'],
        iconState: 'neutral',
      }
    }
    if (dl >= 80) {
      return {
        grade: 'Ultra',
        status: '4K/8K HDR Multi-Screen',
        desc: 'Sustained throughput supports 3+ simultaneous 4K streams.',
        color: '#10B981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        features: ['4K Dolby Vision / HDR', 'Multi-Device Household', 'Instant Playback / No Rebuffering'],
        iconState: 'optimal',
      }
    }
    if (dl >= 35) {
      return {
        grade: 'High',
        status: '4K UHD Flawless',
        desc: 'Optimal bitrate for high-framerate 4K on Netflix, YouTube, Apple TV+.',
        color: '#06B6D4',
        accentBg: 'rgba(6, 182, 212, 0.12)',
        features: ['4K UHD 60fps Capable', 'Zero Buffering Delays', 'High Bitrate Audio (Atmos)'],
        iconState: 'optimal',
      }
    }
    if (dl >= 15) {
      return {
        grade: 'Standard',
        status: '1080p Full HD',
        desc: 'Crisp 1080p playback with dependable buffer headroom.',
        color: '#3B82F6',
        accentBg: 'rgba(59, 130, 246, 0.12)',
        features: ['1080p 60fps Full HD', 'Single Stream Headroom', 'Quick Initial Buffer'],
        iconState: 'fair',
      }
    }
    return {
      grade: dl < 5 ? 'Poor' : 'Basic',
      status: dl < 5 ? 'Buffering Risk' : '720p HD Only',
      desc: 'Bandwidth constrained; video quality will downscale during network peaks.',
      color: dl < 5 ? '#EF4444' : '#F59E0B',
      accentBg: dl < 5 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
      features: ['Resolution Downscaling', 'Rebuffering Pauses', 'Low Bitrate'],
      iconState: dl < 5 ? 'warning' : 'fair',
    }
  }, [dl])

  // 3. Video Calling & Collaboration Score
  const videoCall = React.useMemo(() => {
    if (!isComplete || ul === null || lat === null) {
      return {
        grade: '—',
        status: 'Benchmark Required',
        desc: 'Run speed test to evaluate two-way call fidelity',
        color: '#94A3B8',
        accentBg: 'rgba(100, 116, 139, 0.12)',
        features: ['1080p HD Video', 'Studio Audio Quality', 'Flawless Screen Share'],
        iconState: 'neutral',
      }
    }
    const effJitter = jitter ?? 3
    if (ul >= 12 && lat <= 60 && effJitter <= 8 && loss <= 0.2) {
      return {
        grade: 'Studio HD',
        status: 'Studio Quality Multi-Party',
        desc: 'Uncompromised two-way 1080p feed with fluid 60fps screen share.',
        color: '#10B981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        features: ['Opus High-Bitrate Audio', '60fps Screen Sharing', 'Zero Audio Desync'],
        iconState: 'optimal',
      }
    }
    if (ul >= 5 && lat <= 100 && effJitter <= 15 && loss <= 1) {
      return {
        grade: 'Clear HD',
        status: 'Reliable HD Calling',
        desc: 'Crisp video and voice conferencing on Zoom, Teams, and Google Meet.',
        color: '#06B6D4',
        accentBg: 'rgba(6, 182, 212, 0.12)',
        features: ['720p/1080p Video Feeds', 'Clean Vocal Clarity', 'Stable Presentation Mode'],
        iconState: 'optimal',
      }
    }
    if (ul >= 2 && lat <= 180) {
      return {
        grade: 'Fair',
        status: 'Standard 720p',
        desc: 'Usable for routine 1-on-1 calls; audio may artifact during bursts.',
        color: '#F59E0B',
        accentBg: 'rgba(245, 158, 11, 0.12)',
        features: ['Standard 720p Stream', 'Occasional Voice Robotting', 'Minor Frame Drops'],
        iconState: 'fair',
      }
    }
    return {
      grade: 'Poor',
      status: 'Degraded Quality',
      desc: 'Insufficient uplink bandwidth or heavy jitter; frequent dropped audio.',
      color: '#EF4444',
      accentBg: 'rgba(239, 68, 68, 0.12)',
      features: ['Severe Robotic Voice', 'Video Stutter & Freeze', 'Packet Loss Dropouts'],
      iconState: 'warning',
    }
  }, [ul, lat, jitter, loss])

  const renderGradeIcon = (state: string, color: string) => {
    if (state === 'optimal') return <CheckCircleRounded sx={{ fontSize: 16, color }} />
    if (state === 'fair') return <WarningAmberRounded sx={{ fontSize: 16, color }} />
    if (state === 'warning') return <ErrorOutlineRounded sx={{ fontSize: 16, color }} />
    return <span className="w-1.5 h-1.5 rounded-full bg-[var(--on-surface-dim)]" />
  }

  return (
    <section className={`flex flex-col gap-3 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--on-surface-muted)] font-semibold">
            REAL-WORLD EXPERIENCE
          </span>
          <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-[var(--on-surface)]">
            Application Readiness & QoE
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--on-surface-dim)] hidden sm:inline">
          Telecom Grade Standards
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cloud Gaming & Esports */}
        <div className="nexis-card p-5 flex flex-col justify-between gap-4 border border-[var(--border-subtle)] hover:border-[var(--primary)]/40 transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105"
                style={{ backgroundColor: gaming.accentBg, color: gaming.color }}
              >
                <SportsEsportsRounded sx={{ fontSize: 22 }} />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase font-semibold text-[var(--on-surface-muted)] block">
                  Interactive Gaming
                </span>
                <h3 className="text-sm font-bold font-sans text-[var(--on-surface)] mt-0.5">
                  Competitive & Cloud
                </h3>
              </div>
            </div>

            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border shrink-0"
              style={{
                backgroundColor: gaming.accentBg,
                borderColor: gaming.iconState === 'neutral' ? 'rgba(100, 116, 139, 0.25)' : `${gaming.color}40`,
                color: gaming.color,
              }}
            >
              {gaming.grade}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              {renderGradeIcon(gaming.iconState, gaming.color)}
              <span className={`text-xs font-semibold font-sans ${gaming.iconState === 'neutral' ? 'text-[var(--on-surface-muted)]' : 'text-[var(--on-surface)]'}`}>
                {gaming.status}
              </span>
            </div>
            <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
              {gaming.desc}
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1 text-[11px] font-mono text-[var(--on-surface-dim)]">
            {gaming.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: gaming.iconState === 'neutral' ? 'var(--on-surface-dim)' : gaming.color,
                    opacity: gaming.iconState === 'neutral' ? 0.35 : 1,
                  }}
                />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: 4K / 8K Video Streaming */}
        <div className="nexis-card p-5 flex flex-col justify-between gap-4 border border-[var(--border-subtle)] hover:border-[var(--primary)]/40 transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105"
                style={{ backgroundColor: streaming.accentBg, color: streaming.color }}
              >
                <TvRounded sx={{ fontSize: 22 }} />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase font-semibold text-[var(--on-surface-muted)] block">
                  Media Playback
                </span>
                <h3 className="text-sm font-bold font-sans text-[var(--on-surface)] mt-0.5">
                  4K / 8K HDR Streaming
                </h3>
              </div>
            </div>

            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border shrink-0"
              style={{
                backgroundColor: streaming.accentBg,
                borderColor: streaming.iconState === 'neutral' ? 'rgba(100, 116, 139, 0.25)' : `${streaming.color}40`,
                color: streaming.color,
              }}
            >
              {streaming.grade}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              {renderGradeIcon(streaming.iconState, streaming.color)}
              <span className={`text-xs font-semibold font-sans ${streaming.iconState === 'neutral' ? 'text-[var(--on-surface-muted)]' : 'text-[var(--on-surface)]'}`}>
                {streaming.status}
              </span>
            </div>
            <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
              {streaming.desc}
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1 text-[11px] font-mono text-[var(--on-surface-dim)]">
            {streaming.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: streaming.iconState === 'neutral' ? 'var(--on-surface-dim)' : streaming.color,
                    opacity: streaming.iconState === 'neutral' ? 0.35 : 1,
                  }}
                />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Video Conferencing & Remote Work */}
        <div className="nexis-card p-5 flex flex-col justify-between gap-4 border border-[var(--border-subtle)] hover:border-[var(--primary)]/40 transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105"
                style={{ backgroundColor: videoCall.accentBg, color: videoCall.color }}
              >
                <VideocamRounded sx={{ fontSize: 22 }} />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase font-semibold text-[var(--on-surface-muted)] block">
                  Collaboration
                </span>
                <h3 className="text-sm font-bold font-sans text-[var(--on-surface)] mt-0.5">
                  Conferencing & Voice
                </h3>
              </div>
            </div>

            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border shrink-0"
              style={{
                backgroundColor: videoCall.accentBg,
                borderColor: videoCall.iconState === 'neutral' ? 'rgba(100, 116, 139, 0.25)' : `${videoCall.color}40`,
                color: videoCall.color,
              }}
            >
              {videoCall.grade}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              {renderGradeIcon(videoCall.iconState, videoCall.color)}
              <span className={`text-xs font-semibold font-sans ${videoCall.iconState === 'neutral' ? 'text-[var(--on-surface-muted)]' : 'text-[var(--on-surface)]'}`}>
                {videoCall.status}
              </span>
            </div>
            <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
              {videoCall.desc}
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1 text-[11px] font-mono text-[var(--on-surface-dim)]">
            {videoCall.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: videoCall.iconState === 'neutral' ? 'var(--on-surface-dim)' : videoCall.color,
                    opacity: videoCall.iconState === 'neutral' ? 0.35 : 1,
                  }}
                />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

import { useEffect, useState, useRef } from 'react'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import SkipNextRounded from '@mui/icons-material/SkipNextRounded'
import SkipPreviousRounded from '@mui/icons-material/SkipPreviousRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import type { MeasurementRecord } from '@/data/models'

interface RoutePlaybackBarProps {
  records: MeasurementRecord[]
  currentIndex: number
  onSelectIndex: (index: number) => void
  onClose: () => void
}

export function RoutePlaybackBar({
  records,
  currentIndex,
  onSelectIndex,
  onClose,
}: RoutePlaybackBarProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1)
  const indexRef = useRef(currentIndex)

  useEffect(() => {
    indexRef.current = currentIndex
  }, [currentIndex])

  useEffect(() => {
    if (!isPlaying || records.length === 0) return

    const interval = setInterval(() => {
      const next = indexRef.current + 1
      if (next >= records.length) {
        setIsPlaying(false)
        onSelectIndex(0)
      } else {
        onSelectIndex(next)
      }
    }, 2200 / playbackSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, records.length, playbackSpeed, onSelectIndex])

  if (records.length === 0) return null

  const currentRecord = records[currentIndex]
  const progressPercent = ((currentIndex + 1) / records.length) * 100

  return (
    <div className="absolute bottom-16 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] z-[1020] rounded-2xl border shadow-2xl backdrop-blur-2xl p-3 flex flex-col gap-2 bg-[var(--surface)]/95 border-[var(--border-subtle)] pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
      {/* Header & Status */}
      <div className="flex items-center justify-between text-xs font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
          <span className="font-bold text-[var(--on-surface)]">Drive-Test Route Scrubber</span>
          <span className="text-[10px] font-mono text-[var(--on-surface-muted)]">
            ({currentIndex + 1} of {records.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
          >
            {playbackSpeed}x
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <CloseRounded sx={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {/* Interactive Progress Scrubber */}
      <div
        className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden cursor-pointer relative group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const clickX = e.clientX - rect.left
          const ratio = Math.max(0, Math.min(1, clickX / rect.width))
          const targetIndex = Math.round(ratio * (records.length - 1))
          onSelectIndex(targetIndex)
        }}
        title="Click to seek along route timeline"
      >
        <div
          className="h-full bg-[var(--primary)] transition-all duration-150 group-hover:brightness-110"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Playback Controls & Info */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <SkipPreviousRounded sx={{ fontSize: 18 }} />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
          >
            {isPlaying ? (
              <PauseRounded sx={{ fontSize: 18 }} />
            ) : (
              <PlayArrowRounded sx={{ fontSize: 18 }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectIndex(Math.min(records.length - 1, currentIndex + 1))}
            disabled={currentIndex === records.length - 1}
            className="p-1.5 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 transition-colors cursor-pointer"
          >
            <SkipNextRounded sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Current Node Quick Readout */}
        {currentRecord && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="font-bold text-[var(--primary)]">
              {currentRecord.downloadMbps?.toFixed(1) ?? '—'} Mbps
            </span>
            <span className="text-[var(--on-surface-muted)]">
              {currentRecord.latencyMs?.toFixed(0) ?? '—'} ms
            </span>
            <span className="text-[10px] text-[var(--on-surface-dim)] hidden sm:inline">
              {new Date(currentRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import LeaderboardRounded from '@mui/icons-material/LeaderboardRounded'
import SportsEsportsRounded from '@mui/icons-material/SportsEsportsRounded'
import LiveTvRounded from '@mui/icons-material/LiveTvRounded'
import VideoCallRounded from '@mui/icons-material/VideoCallRounded'
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded'
import BlurOnRounded from '@mui/icons-material/BlurOnRounded'
import type { CarrierScoreResult } from '../utils/carrierScoring'
import { CarrierRadarChart } from './CarrierRadarChart'

interface CarrierMatrixModalProps {
  isOpen: boolean
  onClose: () => void
  carrierMatrix: CarrierScoreResult[]
  onSelectCarrier?: (carrier: string) => void
  mapMode?: 'personal' | 'heatmap'
}

export function CarrierMatrixModal({
  isOpen,
  onClose,
  carrierMatrix,
  onSelectCarrier,
  mapMode = 'personal',
}: CarrierMatrixModalProps) {
  const [viewMode, setViewMode] = useState<'ranking' | 'radar'>('ranking')
  if (!isOpen) return null

  const isPersonal = mapMode === 'personal'

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#FFD700]"
              style={{ backgroundColor: 'rgba(255, 215, 0, 0.12)' }}
            >
              <LeaderboardRounded sx={{ fontSize: 24 }} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-extrabold font-sans tracking-tight">
                {isPersonal ? 'Carrier Network Telemetry Benchmark' : 'Area Carrier Benchmark Matrix'}
              </h2>
              <span className="text-xs font-sans text-[var(--on-surface-muted)]">
                {isPersonal
                  ? 'Real-world network performance computed directly from your saved telemetry records'
                  : 'Rankings synthesized from crowdsourced S2 spatial telemetry in the visible viewport'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Ranking vs Radar */}
            <div className="flex items-center p-0.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setViewMode('ranking')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'ranking'
                    ? 'bg-[var(--surface)] text-[var(--on-surface)] shadow-sm'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                }`}
              >
                <LeaderboardRounded sx={{ fontSize: 16 }} />
                <span>Ranking</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('radar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'radar'
                    ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                }`}
              >
                <BlurOnRounded sx={{ fontSize: 16 }} />
                <span>5-Axis Radar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              <CloseRounded sx={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {carrierMatrix.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--on-surface-muted)]">
              <span className="font-semibold text-sm">No benchmark records available</span>
              <span className="text-xs">Run a speed test to generate real-world carrier telemetry.</span>
            </div>
          ) : viewMode === 'radar' ? (
            <CarrierRadarChart
              carrierMatrix={carrierMatrix}
              onSelectCarrier={onSelectCarrier}
            />
          ) : (
            <>
              {/* Top Podium Cards */}
              <div
                className={`grid gap-3 ${
                  carrierMatrix.length === 1
                    ? 'grid-cols-1 max-w-md mx-auto w-full'
                    : carrierMatrix.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {carrierMatrix.slice(0, 3).map((item, index) => {
                  const medalColor =
                    index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                  const medalBg =
                    index === 0
                      ? 'rgba(255, 215, 0, 0.1)'
                      : index === 1
                      ? 'rgba(192, 192, 192, 0.1)'
                      : 'rgba(205, 127, 50, 0.1)'

                  return (
                    <div
                      key={item.carrier}
                      onClick={() => onSelectCarrier?.(item.carrier)}
                      className="flex flex-col p-4 rounded-2xl border transition-all cursor-pointer hover:border-[var(--primary)] hover:scale-[1.01]"
                      style={{
                        backgroundColor: medalBg,
                        borderColor: index === 0 ? 'rgba(255, 215, 0, 0.35)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black"
                          style={{ backgroundColor: medalColor, color: '#000000' }}
                        >
                          #{index + 1}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[var(--on-surface-dim)]">
                          {item.sampleCount} test{item.sampleCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      <span className="font-bold text-sm truncate font-sans text-[var(--on-surface)]">
                        {item.carrier}
                      </span>
                      <span className="text-[10.5px] font-mono text-[var(--on-surface-muted)]">
                        {item.generation} Network
                      </span>

                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-end justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--on-surface-muted)]">Avg Speed</span>
                          <span className="text-base font-black font-mono text-[var(--primary)]">
                            {item.avgDownloadMbps.toFixed(1)} <span className="text-xs font-normal">Mbps</span>
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-[var(--on-surface-muted)]">Latency</span>
                          <span className="text-sm font-bold font-mono text-[var(--on-surface)]">
                            {item.avgLatencyMs.toFixed(0)} ms
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detailed Performance Comparison Table */}
              <div className="flex flex-col rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex items-center justify-between">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--on-surface-muted)]">
                    Carrier Deep Diagnostics & Experience Scoring
                  </span>
                  <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
                    {isPersonal ? 'Real Telemetry Sample-Weighted Matrix' : 'Defensible Crowdsourced Matrix'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 text-[11px] font-mono text-[var(--on-surface-muted)]">
                        <th className="p-3 font-semibold">Rank & Operator</th>
                        <th className="p-3 font-semibold text-right">Avg / P90 DL</th>
                        <th className="p-3 font-semibold text-right">Ping</th>
                        <th className="p-3 font-semibold text-center">
                          <div className="flex items-center justify-center gap-1" title="Gaming Score (RTT & Jitter)">
                            <SportsEsportsRounded sx={{ fontSize: 14, color: '#06B6D4' }} />
                            <span>Gaming</span>
                          </div>
                        </th>
                        <th className="p-3 font-semibold text-center">
                          <div className="flex items-center justify-center gap-1" title="4K Streaming Score (Throughput)">
                            <LiveTvRounded sx={{ fontSize: 14, color: '#10B981' }} />
                            <span>Streaming</span>
                          </div>
                        </th>
                        <th className="p-3 font-semibold text-center">
                          <div className="flex items-center justify-center gap-1" title="Video Conference Score (Jitter & Upload)">
                            <VideoCallRounded sx={{ fontSize: 14, color: '#F59E0B' }} />
                            <span>Calls</span>
                          </div>
                        </th>
                        <th className="p-3 font-semibold text-center">
                          <div className="flex items-center justify-center gap-1" title="Reliability & Stability">
                            <VerifiedUserRounded sx={{ fontSize: 14, color: '#8B5CF6' }} />
                            <span>Reliability</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {carrierMatrix.map((c, i) => (
                        <tr
                          key={c.carrier}
                          className="hover:bg-[var(--bg-subtle)]/40 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[var(--on-surface-dim)]">
                                #{i + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--on-surface)]">{c.carrier}</span>
                                <span className="text-[10px] text-[var(--on-surface-muted)] font-mono">
                                  {c.generation} • {c.sampleCount} test{c.sampleCount === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono">
                            <span className="font-bold text-[var(--on-surface)]">
                              {c.avgDownloadMbps.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-[var(--on-surface-dim)] block">
                              P90: {c.p90DownloadMbps.toFixed(1)}M
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-[var(--on-surface)]">
                            {c.avgLatencyMs.toFixed(0)} ms
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                              style={{
                                backgroundColor:
                                  c.gamingScore >= 80
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : c.gamingScore >= 60
                                    ? 'rgba(6, 182, 212, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  c.gamingScore >= 80
                                    ? '#10B981'
                                    : c.gamingScore >= 60
                                    ? '#06B6D4'
                                    : '#EF4444',
                              }}
                            >
                              {c.gamingScore}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                              style={{
                                backgroundColor:
                                  c.streamingScore >= 80
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : c.streamingScore >= 60
                                    ? 'rgba(6, 182, 212, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  c.streamingScore >= 80
                                    ? '#10B981'
                                    : c.streamingScore >= 60
                                    ? '#06B6D4'
                                    : '#EF4444',
                              }}
                            >
                              {c.streamingScore}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                              style={{
                                backgroundColor:
                                  c.videoCallsScore >= 80
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : c.videoCallsScore >= 60
                                    ? 'rgba(6, 182, 212, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  c.videoCallsScore >= 80
                                    ? '#10B981'
                                    : c.videoCallsScore >= 60
                                    ? '#06B6D4'
                                    : '#EF4444',
                              }}
                            >
                              {c.videoCallsScore}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-bold text-xs text-[var(--on-surface)]">
                              {c.reliabilityScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between text-xs font-sans">
          <span className="text-[11px] text-[var(--on-surface-muted)]">
            Privacy Boundary: Aggregated spatial S2 cells (k &ge; 5) & local client-side sandbox.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

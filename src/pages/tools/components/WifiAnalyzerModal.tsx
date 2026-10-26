import { useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import { MOCK_WIFI_CHANNELS } from '../toolsData'

interface WifiAnalyzerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function WifiAnalyzerModal({ isOpen, onClose, onAddLog }: WifiAnalyzerModalProps) {
  const [selectedBand, setSelectedBand] = useState<'2.4' | '5'>('2.4')
  const [isScanning, setIsScanning] = useState(false)

  if (!isOpen) return null

  const handleScanSpectrum = async () => {
    setIsScanning(true)
    onAddLog?.(`[WiFiAnalyzer] Scanning ${selectedBand} GHz RF radio spectrum and beacon frames...`, 'info')
    await new Promise((r) => setTimeout(r, 700))
    setIsScanning(false)
    onAddLog?.(`[WiFiAnalyzer] Spectrum refreshed: Channel 11 (2.4 GHz) & Channel 36 (5 GHz) recommended`, 'success')
  }

  const filteredChannels = MOCK_WIFI_CHANNELS.filter((c) =>
    selectedBand === '2.4' ? c.band === '2.4 GHz' : c.band === '5 GHz'
  )

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)' }}
            >
              <WifiRounded sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">Wi-Fi Spectrum & Channel Analyzer</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  802.11 BEACON / RF
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                2.4 GHz vs 5 GHz channel congestion rating, co-channel overlap & interference diagnostics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] transition-all cursor-pointer"
          >
            <CloseRounded sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Band Switcher & Scan Action Bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setSelectedBand('2.4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedBand === '2.4'
                  ? 'bg-cyan-500 text-black shadow-xs font-bold'
                  : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
              }`}
            >
              2.4 GHz Spectrum
            </button>
            <button
              onClick={() => setSelectedBand('5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedBand === '5'
                  ? 'bg-cyan-500 text-black shadow-xs font-bold'
                  : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
              }`}
            >
              5 GHz UNII Spectrum
            </button>
          </div>

          <button
            onClick={handleScanSpectrum}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 bg-cyan-500 text-black hover:bg-cyan-400 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Scanning RF...</span>
              </>
            ) : (
              <>
                <PlayArrowRounded sx={{ fontSize: 16 }} />
                <span>Rescan Spectrum</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
          {/* Signal HUD banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Current RSSI</span>
              <span className="text-lg font-mono font-bold text-emerald-400">-46 dBm (Optimal)</span>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Noise Floor</span>
              <span className="text-lg font-mono font-bold text-[var(--on-surface)]">-92 dBm</span>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">SNR Margin</span>
              <span className="text-lg font-mono font-bold text-cyan-400">46 dB (Pristine)</span>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Recommended Channel</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {selectedBand === '2.4' ? 'CH 11 (2462 MHz)' : 'CH 36 (5180 MHz)'}
              </span>
            </div>
          </div>

          {/* Visual Spectrum Overlap Chart */}
          <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
                  RF FREQUENCY OCCUPANCY & CHANNEL OVERLAP ({selectedBand} GHZ)
                </h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)] mt-0.5">
                  Overlapping side lobes cause co-channel carrier degradation and packet retransmissions.
                </p>
              </div>
            </div>

            <div className="h-40 w-full relative flex items-end justify-between px-4 pb-6 pt-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/20 rounded-xl overflow-hidden">
              {filteredChannels.map((c, i) => {
                const heightPercent = c.utilization
                const isOptimal = c.rating === 'Optimal' || c.rating === 'Pristine'
                return (
                  <div key={c.channel} className="flex-1 flex flex-col items-center justify-end h-full px-2 group">
                    <span className="text-[10px] font-mono font-bold text-[var(--on-surface-muted)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.utilization}% load
                    </span>
                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-500 relative flex items-center justify-center ${
                        isOptimal ? 'bg-cyan-400/80 group-hover:bg-cyan-400' : 'bg-rose-500/80 group-hover:bg-rose-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-black">
                        CH {c.channel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detailed Channels List */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
              FREQUENCY CHANNELS TELEMETRY
            </span>

            <div className="flex flex-col gap-2">
              {filteredChannels.map((chan) => (
                <div
                  key={chan.channel}
                  className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-mono font-extrabold text-cyan-400">
                        {chan.channel}
                      </span>
                      <span className="text-[8px] font-mono text-[var(--on-surface-dim)]">
                        CH
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-sans text-[var(--on-surface)]">
                          Frequency {chan.freq} ({chan.band})
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            chan.rating === 'Pristine' || chan.rating === 'Optimal'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {chan.rating.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-[var(--on-surface-muted)] truncate mt-0.5">
                        {chan.overlap} · {chan.networks} neighboring beacons detected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:self-center self-end">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono font-bold text-[var(--on-surface)]">
                        {chan.utilization}% Congestion
                      </span>
                      <div className="w-24 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            chan.utilization > 50 ? 'bg-rose-400' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${chan.utilization}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]">
            <CheckCircleRounded sx={{ fontSize: 16, color: '#10B981' }} />
            <span>Zero DFS radar interference detected on UNII frequency bounds</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium transition-all cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

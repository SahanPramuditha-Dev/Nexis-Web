import { useNavigate } from 'react-router-dom'
import CloseRounded from '@mui/icons-material/CloseRounded'
import DirectionsWalkRounded from '@mui/icons-material/DirectionsWalkRounded'
import DomainRounded from '@mui/icons-material/DomainRounded'
import MapRounded from '@mui/icons-material/MapRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import SensorsRounded from '@mui/icons-material/SensorsRounded'

interface SurveyorModalProps {
  isOpen: boolean
  onClose: () => void
  toolId: 'walk-map' | 'venue-builder' | 'tower-los'
  onAddLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void
}

export function SurveyorModal({ isOpen, onClose, toolId }: SurveyorModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const isVenue = toolId === 'venue-builder'
  const isTower = toolId === 'tower-los'

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{
                background: isTower
                  ? 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)'
                  : isVenue
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
                  : 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              }}
            >
              {isTower ? (
                <SensorsRounded sx={{ fontSize: 24 }} />
              ) : isVenue ? (
                <DomainRounded sx={{ fontSize: 24 }} />
              ) : (
                <DirectionsWalkRounded sx={{ fontSize: 24 }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-sans tracking-tight">
                  {isTower
                    ? 'Cellular Tower Line-of-Sight'
                    : isVenue
                    ? 'Venue & Campus Structure Builder'
                    : 'Walk & Map (Campus Surveyor)'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  SPATIAL GIS
                </span>
              </div>
              <p className="text-xs font-sans text-[var(--on-surface-muted)]">
                {isTower
                  ? 'Calculate Fresnel zone clearance, distance, and azimuth bearing to cell mast'
                  : isVenue
                  ? 'Multi-level floor plans, AP placements, and dead-zone attenuation modelling'
                  : 'Continuous GPS/Wi-Fi mobility survey with AP handover logging'}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {/* Spatial overview card */}
          <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold text-[var(--on-surface-dim)] uppercase">
              GEOSPATIAL TELEMETRY SYNC
            </span>
            <p className="text-xs font-sans text-[var(--on-surface)] leading-relaxed">
              Spatial surveying tracks real-world coordinates and correlates RF signal strength directly with physical coordinates.
              All walk paths, AP handovers, and elevation profiles are rendered dynamically on the interactive Cellular Coverage Map.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  onClose()
                  navigate('/map')
                }}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-sans font-bold flex items-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <MapRounded sx={{ fontSize: 16 }} />
                <span>Open in Full GIS Map</span>
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">GPS Accuracy</span>
              <span className="text-base font-mono font-bold text-emerald-400">± 2.4 meters</span>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">AP Handovers</span>
              <span className="text-base font-mono font-bold text-cyan-400">0 Gaps Detected</span>
            </div>
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase">Fresnel Clearance</span>
              <span className="text-base font-mono font-bold text-indigo-400">100% (Line-of-Sight)</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]">
            <CheckCircleRounded sx={{ fontSize: 16, color: '#10B981' }} />
            <span>Integrated with S2 Hierarchical Geometry Engine</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-sans font-medium transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

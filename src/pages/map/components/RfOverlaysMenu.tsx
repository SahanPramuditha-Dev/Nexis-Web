import TuneRounded from '@mui/icons-material/TuneRounded'
import TimelineRounded from '@mui/icons-material/TimelineRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'
import FlashOnRounded from '@mui/icons-material/FlashOnRounded'
import BlurOnRounded from '@mui/icons-material/BlurOnRounded'
import LandscapeRounded from '@mui/icons-material/LandscapeRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import GradientRounded from '@mui/icons-material/GradientRounded'
import FilterAltRounded from '@mui/icons-material/FilterAltRounded'

export interface RfOverlaySettings {
  showRouteTrajectory: boolean
  showCellTowers: boolean
  showServingLaser: boolean
  showSignalAura: boolean
  showElevationProfile: boolean
  showSpeedCorridor: boolean
  showSectorWedges: boolean
  carrierFilter: 'all' | 'dialog' | 'mobitel' | 'hutch' | 'airtel'
}

interface RfOverlaysMenuProps {
  settings: RfOverlaySettings
  onChange: (newSettings: RfOverlaySettings) => void
  isOpen: boolean
  onToggleOpen: () => void
}

export function RfOverlaysMenu({
  settings,
  onChange,
  isOpen,
  onToggleOpen,
}: RfOverlaysMenuProps) {
  const isAnyActive =
    settings.showRouteTrajectory ||
    settings.showCellTowers ||
    settings.showServingLaser ||
    settings.showSignalAura ||
    settings.showElevationProfile ||
    settings.showSpeedCorridor ||
    settings.showSectorWedges ||
    settings.carrierFilter !== 'all'

  const toggle = (key: keyof RfOverlaySettings) => {
    onChange({
      ...settings,
      [key]: !settings[key],
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleOpen}
        className={`p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl transition-all cursor-pointer ${
          isOpen || isAnyActive
            ? 'bg-[var(--primary)] text-white shadow-md'
            : 'bg-[var(--surface)]/95 border-[var(--border-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:border-[var(--primary)]'
        }`}
        title="RF Overlays & Telecom Layer Controls"
      >
        <TuneRounded sx={{ fontSize: 18 }} />
      </button>

      {isOpen && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-64 rounded-2xl border shadow-2xl backdrop-blur-2xl p-2 flex flex-col gap-1.5 z-[1100] bg-[var(--surface)]/95 border-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
              RF & GIS Infrastructure
            </span>
            <span className="text-[9px] font-mono text-[var(--primary)] font-bold">
              {Object.values(settings).filter(Boolean).length}/7 ACTIVE
            </span>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1 px-1 py-1 border-b border-[var(--border-subtle)] text-[10px] font-medium">
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...settings,
                  showRouteTrajectory: true,
                  showSpeedCorridor: true,
                  showCellTowers: false,
                  showServingLaser: true,
                  showSectorWedges: false,
                  showSignalAura: true,
                })
              }}
              className="px-2 py-1 rounded-lg bg-[var(--bg-subtle)] text-[var(--on-surface)] hover:text-white hover:bg-[var(--primary)] transition-colors text-center"
              title="Drive-test trajectory and speed gradients"
            >
              Speed Mode
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...settings,
                  showRouteTrajectory: false,
                  showSpeedCorridor: false,
                  showCellTowers: true,
                  showServingLaser: false,
                  showSectorWedges: true,
                  showSignalAura: false,
                })
              }}
              className="px-2 py-1 rounded-lg bg-[var(--bg-subtle)] text-[var(--on-surface)] hover:text-white hover:bg-[var(--primary)] transition-colors text-center"
              title="Reference cell masts and directional sectors"
            >
              BTS Masts
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...settings,
                  showRouteTrajectory: false,
                  showSpeedCorridor: false,
                  showCellTowers: false,
                  showServingLaser: false,
                  showSectorWedges: false,
                  showSignalAura: false,
                  showElevationProfile: false,
                })
              }}
              className="px-2 py-1 rounded-lg bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--border-subtle)] transition-colors text-center"
              title="Minimalist clean view"
            >
              Minimal
            </button>
          </div>

          {/* 1. Route Trajectory */}
          <button
            type="button"
            onClick={() => toggle('showRouteTrajectory')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showRouteTrajectory
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <TimelineRounded sx={{ fontSize: 16, color: '#00E5FF' }} />
              <div className="flex flex-col">
                <span>Route Trajectory</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Drive-test path polyline
                </span>
              </div>
            </div>
            {settings.showRouteTrajectory && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 2. Physical Cell Towers */}
          <button
            type="button"
            onClick={() => toggle('showCellTowers')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showCellTowers
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <CellTowerRounded sx={{ fontSize: 16, color: '#F59E0B' }} />
              <div className="flex flex-col">
                <span>Reference Base Stations</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Registered 5G/LTE masts
                </span>
              </div>
            </div>
            {settings.showCellTowers && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 3. Nearest BTS Vector */}
          <button
            type="button"
            onClick={() => {
              const willBeActive = !settings.showServingLaser
              onChange({
                ...settings,
                showServingLaser: willBeActive,
                // Automatically ensure cell towers are enabled when laser vector is turned on
                showCellTowers: willBeActive ? true : settings.showCellTowers,
              })
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showServingLaser
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <FlashOnRounded sx={{ fontSize: 16, color: '#FF9100' }} />
              <div className="flex flex-col">
                <span>Nearest BTS Vector</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Estimated proximity bearing
                </span>
              </div>
            </div>
            {settings.showServingLaser && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 4. Signal Footprint Aura */}
          <button
            type="button"
            onClick={() => toggle('showSignalAura')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showSignalAura
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <BlurOnRounded sx={{ fontSize: 16, color: '#10B981' }} />
              <div className="flex flex-col">
                <span>Signal Footprint Aura</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Radial RF confidence aura
                </span>
              </div>
            </div>
            {settings.showSignalAura && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 5. Elevation & Topography Graph */}
          <button
            type="button"
            onClick={() => toggle('showElevationProfile')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showElevationProfile
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <LandscapeRounded sx={{ fontSize: 16, color: '#10B981' }} />
              <div className="flex flex-col">
                <span>Elevation Profile</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Terrain vs throughput chart
                </span>
              </div>
            </div>
            {settings.showElevationProfile && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 6. Speed Corridor Gradient */}
          <button
            type="button"
            onClick={() => toggle('showSpeedCorridor')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showSpeedCorridor
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <GradientRounded sx={{ fontSize: 16, color: '#38BDF8' }} />
              <div className="flex flex-col">
                <span>Speed Heat Corridor</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Segmented throughput gradient
                </span>
              </div>
            </div>
            {settings.showSpeedCorridor && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 7. Directional Antenna Sectors */}
          <button
            type="button"
            onClick={() => toggle('showSectorWedges')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
              settings.showSectorWedges
                ? 'bg-[var(--bg-subtle)] text-[var(--primary)] font-bold'
                : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <CellTowerRounded sx={{ fontSize: 16, color: '#EC4899' }} />
              <div className="flex flex-col">
                <span>Sector Bearing Wedges</span>
                <span className="text-[9.5px] font-normal text-[var(--on-surface-muted)]">
                  Directional RF cell azimuths
                </span>
              </div>
            </div>
            {settings.showSectorWedges && <CheckRounded sx={{ fontSize: 15 }} />}
          </button>

          {/* 8. Tower Carrier Filter */}
          <div className="pt-2 mt-1 border-t border-[var(--border-subtle)] flex flex-col gap-1.5 px-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--on-surface-dim)]">
              <span className="flex items-center gap-1 font-bold uppercase">
                <FilterAltRounded sx={{ fontSize: 13 }} />
                <span>Tower Carrier Filter</span>
              </span>
              <span className="capitalize text-[var(--primary)] font-bold">
                {settings.carrierFilter}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['all', 'dialog', 'mobitel'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...settings, carrierFilter: c })}
                  className={`py-1 rounded-lg text-[10.5px] font-mono uppercase font-bold transition-all text-center cursor-pointer ${
                    settings.carrierFilter === c
                      ? c === 'dialog'
                        ? 'bg-[#EF4444] text-white shadow-xs'
                        : c === 'mobitel'
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quick link to Settings API Token */}
          <div className="pt-1.5 mt-0.5 border-t border-[var(--border-subtle)] flex items-center justify-between px-1">
            <span className="text-[9.5px] text-[var(--on-surface-dim)]">OpenCelliD API Key:</span>
            <a
              href="/settings"
              className="text-[10px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-0.5"
            >
              <span>Manage Token &rarr;</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

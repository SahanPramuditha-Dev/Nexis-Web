import React from 'react'
import HealingRounded from '@mui/icons-material/HealingRounded'
import PublicRounded from '@mui/icons-material/PublicRounded'
import AltRouteRounded from '@mui/icons-material/AltRouteRounded'
import SecurityRounded from '@mui/icons-material/SecurityRounded'
import DevicesRounded from '@mui/icons-material/DevicesRounded'
import DnsRounded from '@mui/icons-material/DnsRounded'
import PowerSettingsNewRounded from '@mui/icons-material/PowerSettingsNewRounded'
import SpeedRounded from '@mui/icons-material/SpeedRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import RouterRounded from '@mui/icons-material/RouterRounded'
import NetworkCheckRounded from '@mui/icons-material/NetworkCheckRounded'
import DirectionsWalkRounded from '@mui/icons-material/DirectionsWalkRounded'
import DomainRounded from '@mui/icons-material/DomainRounded'
import SensorsRounded from '@mui/icons-material/SensorsRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import type { ToolItem } from '../toolsData'

interface ToolCardProps {
  tool: ToolItem
  onClick: () => void
  statusText?: string
  isRunning?: boolean
}

export function ToolCard({ tool, onClick, statusText, isRunning }: ToolCardProps) {
  const renderIcon = () => {
    const props = { sx: { fontSize: 22, color: '#FFFFFF' } }
    switch (tool.iconName) {
      case 'HealingRounded':
        return <HealingRounded {...props} />
      case 'PublicRounded':
        return <PublicRounded {...props} />
      case 'AltRouteRounded':
        return <AltRouteRounded {...props} />
      case 'SecurityRounded':
        return <SecurityRounded {...props} />
      case 'DevicesRounded':
        return <DevicesRounded {...props} />
      case 'DnsRounded':
        return <DnsRounded {...props} />
      case 'PowerSettingsNewRounded':
        return <PowerSettingsNewRounded {...props} />
      case 'SpeedRounded':
        return <SpeedRounded {...props} />
      case 'WifiRounded':
        return <WifiRounded {...props} />
      case 'RouterRounded':
        return <RouterRounded {...props} />
      case 'NetworkCheckRounded':
        return <NetworkCheckRounded {...props} />
      case 'DirectionsWalkRounded':
        return <DirectionsWalkRounded {...props} />
      case 'DomainRounded':
        return <DomainRounded {...props} />
      case 'SensorsRounded':
        return <SensorsRounded {...props} />
      default:
        return <SpeedRounded {...props} />
    }
  }

  return (
    <div
      onClick={onClick}
      className="nexis-card p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all duration-200 hover:border-[var(--primary)] group shadow-sm hover:shadow-md relative overflow-hidden"
    >
      {/* Top row: Icon + Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105"
            style={{ background: tool.gradient }}
          >
            {renderIcon()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--on-surface-muted)] border border-[var(--border-subtle)]">
                {tool.badge}
              </span>
              <span className="text-[10px] font-mono text-[var(--on-surface-dim)] hidden sm:inline">
                {tool.protocol}
              </span>
            </div>
            <h3 className="text-base font-bold font-sans tracking-tight text-[var(--on-surface)] mt-1 group-hover:text-[var(--primary)] transition-colors">
              {tool.title}
            </h3>
          </div>
        </div>

        {/* Action arrow or loading spinner */}
        <div className="shrink-0 pt-1">
          {isRunning ? (
            <span className="w-5 h-5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin block" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex items-center justify-center text-[var(--on-surface-muted)] group-hover:text-[var(--primary)] group-hover:border-[var(--primary)]/40 transition-all">
              <ChevronRightRounded sx={{ fontSize: 18 }} />
            </div>
          )}
        </div>
      </div>

      {/* Subtitle / Description */}
      <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed line-clamp-2">
        {tool.subtitle}
      </p>

      {/* Capabilities Tag Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {tool.capabilities.slice(0, 3).map((cap) => (
          <span
            key={cap}
            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-subtle)]/70 text-[var(--on-surface-dim)] group-hover:text-[var(--on-surface-muted)] transition-colors"
          >
            {cap}
          </span>
        ))}
        {tool.capabilities.length > 3 && (
          <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
            +{tool.capabilities.length - 3} more
          </span>
        )}
      </div>

      {/* Bottom Bar: Status / Launch trigger */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
          <span className="font-mono text-[11px] text-[var(--on-surface-muted)] truncate max-w-[200px]">
            {statusText || 'Ready to probe'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="text-xs font-sans font-bold text-[var(--primary)] flex items-center gap-1 group-hover:underline cursor-pointer"
        >
          <span>Launch Probe</span>
          <PlayArrowRounded sx={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  )
}

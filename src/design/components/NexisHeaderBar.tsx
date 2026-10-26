import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SensorsRounded from '@mui/icons-material/SensorsRounded'
import BoltRounded from '@mui/icons-material/BoltRounded'
import { NexisMark } from './NexisMark'
import { ThemeToggle } from './ThemeToggle'
import { detectClientCarrier } from '@/data/carrierService'

interface NexisHeaderBarProps {
  pingMs?: number | null
}

const ROUTE_TITLES: Record<string, { section: string; title: string }> = {
  '/': { section: 'Cockpit', title: 'Speed & Telemetry' },
  '/history': { section: 'Telemetry', title: 'Measurement History' },
  '/map': { section: 'GIS', title: 'Cellular Coverage Map' },
  '/topology': { section: 'Infrastructure', title: 'Subnet Topology Matrix' },
  '/tools': { section: 'Diagnostics', title: 'Network Toolset' },
  '/analytics': { section: 'Intelligence', title: 'Trend & Matrix Analytics' },
  '/alerts': { section: 'Intelligence', title: 'Incident & SLA Alerts' },
  '/settings': { section: 'System', title: 'Engine Configuration' },
  '/docs': { section: 'Resources', title: 'Engineering Documentation' },
  '/legal': { section: 'Governance', title: 'Privacy & Legal Policies' },
  '/privacy': { section: 'Governance', title: 'Privacy Policy' },
  '/terms': { section: 'Governance', title: 'Terms of Service' },
}

export function NexisHeaderBar({ pingMs }: NexisHeaderBarProps) {
  const [publicIp, setPublicIp] = useState<string>('Detecting...')
  const [carrierName, setCarrierName] = useState<string>('')
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
  const location = useLocation()
  const activeRoute =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/history/')
      ? { section: 'Telemetry', title: 'Session Breakdown' }
      : { section: 'Workspace', title: 'Overview' })

  useEffect(() => {
    const resolveIdentity = async () => {
      try {
        const info = await detectClientCarrier()
        if (info.ip) setPublicIp(info.ip)
        if (info.isp) setCarrierName(info.isp)
      } catch {
        setPublicIp('Client Connected')
      }
    }

    const handleOnline = () => {
      setIsOnline(true)
      resolveIdentity()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setPublicIp('Network Offline')
      setCarrierName('')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (navigator.onLine) {
      resolveIdentity()
    } else {
      setPublicIp('Network Offline')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header
      className="nexis-header-shell h-14 w-full px-4 md:px-6 flex items-center justify-between border-b shrink-0 z-50 backdrop-blur-2xl select-none transition-colors"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 85%, transparent)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* ── Left Context ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile: Logo (since sidebar is hidden) */}
        <div className="flex md:hidden items-center gap-2">
          <NexisMark size={24} />
          <span
            className="text-sm font-black tracking-widest font-mono"
            style={{ color: 'var(--on-surface)' }}
          >
            NEXIS
          </span>
        </div>

        {/* Desktop: Apple-style Clean View Breadcrumb with Smooth Route Transition */}
        <div
          key={location.pathname}
          className="nexis-breadcrumb-fade hidden md:flex items-center gap-2 text-xs font-sans"
        >
          <span
            className="text-[11px] uppercase tracking-wider font-semibold text-[var(--on-surface-dim)]"
          >
            {activeRoute.section}
          </span>
          <span className="text-[var(--on-surface-dim)] text-xs font-normal">/</span>
          <span
            className="font-semibold text-[13px] tracking-tight text-[var(--on-surface)]"
          >
            {activeRoute.title}
          </span>
        </div>
      </div>

      {/* ── Center: Apple Dynamic Island Telemetry Capsule ───────────────── */}
      <div
        className="hidden sm:inline-flex items-center gap-3 px-4 py-1.5 rounded-full border text-xs transition-all duration-200 shadow-sm hover:scale-[1.01]"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Live Client IP & Pulsing Status Dot */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isOnline && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{
                backgroundColor: isOnline ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            />
          </span>
          <span
            className="font-semibold tracking-tight font-mono tabular-nums text-[var(--on-surface)]"
          >
            {publicIp}
          </span>
          {carrierName && (
            <span className="hidden sm:inline font-sans text-[11px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-md">
              {carrierName}
            </span>
          )}
          <span
            className={`hidden lg:inline text-[10px] font-sans uppercase font-bold tracking-wider ${
              isOnline ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Hairline Divider */}
        <div
          className="w-[1px] h-3.5"
          style={{ backgroundColor: 'var(--border-subtle)' }}
        />

        {/* Measurement Node */}
        <div
          className="flex items-center gap-1.5 font-sans"
          style={{ color: 'var(--on-surface-muted)' }}
        >
          <SensorsRounded sx={{ fontSize: 14, color: 'var(--primary)' }} />
          <span className="font-medium text-xs">NEXIS Edge</span>
          <span
            className="hidden xl:inline text-[10px] text-[var(--on-surface-dim)] font-normal"
          >
            (Global Anycast)
          </span>
        </div>

        {/* Live Latency Chip (when available) */}
        {pingMs !== undefined && pingMs !== null && (
          <>
            <div
              className="w-[1px] h-3.5"
              style={{ backgroundColor: 'var(--border-subtle)' }}
            />
            <div
              className="flex items-center gap-1 font-bold text-xs"
              style={{ color: 'var(--on-surface)' }}
            >
              <BoltRounded sx={{ fontSize: 13, color: 'var(--primary)' }} />
              <span className="font-mono tabular-nums">{pingMs}</span>
              <span className="font-sans font-normal text-[10px] text-[var(--on-surface-muted)]">ms</span>
            </div>
          </>
        )}
      </div>

      {/* ── Right: Refined Apple Control Center Theme Toggle ─────────────── */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  )
}

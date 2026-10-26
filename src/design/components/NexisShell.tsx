import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import HomeRounded from '@mui/icons-material/HomeRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import MapRounded from '@mui/icons-material/MapRounded'
import BuildRounded from '@mui/icons-material/BuildRounded'
import HubRounded from '@mui/icons-material/HubRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardDoubleArrowLeftRounded from '@mui/icons-material/KeyboardDoubleArrowLeftRounded'
import KeyboardDoubleArrowRightRounded from '@mui/icons-material/KeyboardDoubleArrowRightRounded'
import SecurityRounded from '@mui/icons-material/SecurityRounded'
import WifiRounded from '@mui/icons-material/WifiRounded'
import DirectionsWalkRounded from '@mui/icons-material/DirectionsWalkRounded'
import WidgetsRounded from '@mui/icons-material/WidgetsRounded'
import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import PolicyRounded from '@mui/icons-material/PolicyRounded'
import { clsx } from 'clsx'
import { NexisMark } from './NexisMark'
import { NexisHeaderBar } from './NexisHeaderBar'
import { useHistoryStore } from '@/stores/historyStore'

interface SubItem {
  to: string
  label: string
  Icon: React.ComponentType<{ sx?: Record<string, unknown> }>
}

interface NavSection {
  header?: string
  items: {
    to: string
    label: string
    Icon: React.ComponentType<{ sx?: Record<string, unknown> }>
    badge?: string | number
    badgeColor?: string
    subItems?: SubItem[]
  }[]
}

export function NexisShell() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('nexis_sidebar_collapsed') === 'true'
  })
  const [toolsOpen, setToolsOpen] = useState<boolean>(true)
  const location = useLocation()
  const historyRecords = useHistoryStore((s) => s.records)
  const loadHistory = useHistoryStore((s) => s.load)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('nexis_sidebar_collapsed', String(next))
      return next
    })
  }

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navSections: NavSection[] = [
    {
      header: 'MONITORING',
      items: [
        { to: '/', label: 'Home Cockpit', Icon: HomeRounded },
        {
          to: '/history',
          label: 'History',
          Icon: HistoryRounded,
          badge: historyRecords.length > 0 ? historyRecords.length : undefined,
        },
        { to: '/map', label: 'Coverage Map', Icon: MapRounded },
      ],
    },
    {
      header: 'DIAGNOSTICS & RF',
      items: [
        {
          to: '/tools',
          label: 'Tools & Probes',
          Icon: BuildRounded,
          subItems: [
            { to: '/tools', label: 'All Tools Hub', Icon: WidgetsRounded },
            { to: '/tools?cat=subnet', label: 'Subnet & Security', Icon: SecurityRounded },
            { to: '/tools?cat=rf', label: 'Wi-Fi & RF Radio', Icon: WifiRounded },
            { to: '/tools?cat=spatial', label: 'Spatial Surveyor', Icon: DirectionsWalkRounded },
          ],
        },
        {
          to: '/topology',
          label: 'Topology Matrix',
          Icon: HubRounded,
          badge: 'Live',
          badgeColor: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
        },
      ],
    },
    {
      header: 'INTELLIGENCE',
      items: [
        { to: '/analytics', label: 'Analytics', Icon: BarChartRounded },
        {
          to: '/alerts',
          label: 'Incident Alerts',
          Icon: NotificationsActiveRounded,
          badge: '3',
          badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        },
      ],
    },
    {
      header: 'RESOURCES',
      items: [
        { to: '/docs', label: 'Documentation', Icon: MenuBookRounded },
        { to: '/legal', label: 'Privacy & Policies', Icon: PolicyRounded },
      ],
    },
    {
      header: 'SYSTEM',
      items: [{ to: '/settings', label: 'Settings', Icon: SettingsRounded }],
    },
  ]

  // Mobile Bottom Nav items (curated top 6)
  const mobileNav = [
    { to: '/', label: 'Home', Icon: HomeRounded },
    { to: '/history', label: 'History', Icon: HistoryRounded },
    { to: '/map', label: 'Map', Icon: MapRounded },
    { to: '/topology', label: 'Topology', Icon: HubRounded },
    { to: '/tools', label: 'Tools', Icon: BuildRounded },
    { to: '/analytics', label: 'Analytics', Icon: BarChartRounded },
  ]

  return (
    <div className="flex h-full w-full" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Desktop Sidebar (macOS / iPadOS Source List Frosted Glass) ──── */}
      <aside
        className={clsx(
          'nexis-sidebar-shell hidden md:flex flex-col shrink-0 border-r h-full transition-all duration-300 ease-in-out select-none relative backdrop-blur-2xl',
          isCollapsed ? 'w-[72px]' : 'w-64',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Brand Header */}
        <div
          className={clsx(
            'flex items-center h-14 border-b shrink-0 transition-all px-4',
            isCollapsed ? 'justify-center' : 'justify-between',
          )}
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <NexisMark size={26} />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span
                  className="text-sm font-black tracking-widest font-mono truncate"
                  style={{ color: 'var(--on-surface)' }}
                >
                  NEXIS
                </span>
                <span
                  className="text-[8.5px] font-mono tracking-wider uppercase truncate"
                  style={{ color: 'var(--on-surface-dim)' }}
                >
                  Intelligence Platform
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
              className="p-1.5 rounded-lg text-[var(--on-surface-dim)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              <KeyboardDoubleArrowLeftRounded sx={{ fontSize: 18 }} />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="flex flex-col gap-1">
              {/* Section Header Label (shown only when expanded) */}
              {!isCollapsed && sec.header && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--on-surface-dim)]">
                  {sec.header}
                </div>
              )}

              {/* Items in section */}
              {sec.items.map((item) => {
                const isToolsItem = item.to === '/tools'
                const isToolsRouteActive = location.pathname.startsWith('/tools')

                if (isToolsItem && !isCollapsed) {
                  return (
                    <div key={item.to} className="flex flex-col gap-1">
                      {/* Parent Tools Link + Accordion toggle button */}
                      <div
                        className={clsx(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-xs font-sans font-semibold group cursor-pointer relative',
                          isToolsRouteActive
                            ? 'text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-bold'
                            : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]',
                        )}
                        onClick={() => setToolsOpen(!toolsOpen)}
                      >
                        {/* Active strip indicator */}
                        {isToolsRouteActive && (
                          <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.Icon sx={{ fontSize: 19 }} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <KeyboardArrowDownRounded
                            sx={{ fontSize: 16 }}
                            className={clsx(
                              'transition-transform duration-200 text-[var(--on-surface-dim)] group-hover:text-[var(--on-surface)]',
                              toolsOpen ? 'rotate-180' : '',
                            )}
                          />
                        </div>
                      </div>

                      {/* Sub-items (expanded state) */}
                      {toolsOpen && item.subItems && (
                        <div className="flex flex-col gap-1 pl-4 pr-1 py-0.5 border-l border-[var(--border-subtle)] ml-4">
                          {item.subItems.map((sub) => {
                            const isSubActive =
                              location.pathname + location.search === sub.to ||
                              (sub.to === '/tools' &&
                                location.pathname === '/tools' &&
                                !location.search)

                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                viewTransition
                                className={clsx(
                                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-sans font-semibold transition-all duration-150',
                                  isSubActive
                                    ? 'text-[var(--primary)] bg-[var(--bg-subtle)] font-bold'
                                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]',
                                )}
                              >
                                <sub.Icon sx={{ fontSize: 16 }} />
                                <span className="truncate">{sub.label}</span>
                              </NavLink>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                // Standard Nav Item
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    viewTransition
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center rounded-xl transition-all duration-200 font-sans font-semibold text-xs tracking-wide relative group',
                        isCollapsed
                          ? 'justify-center p-3 w-full'
                          : 'px-3 py-2.5 justify-between w-full',
                        isActive
                          ? 'text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-bold shadow-xs'
                          : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.Icon sx={{ fontSize: isCollapsed ? 22 : 19 }} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {/* Badges */}
                        {!isCollapsed && item.badge && (
                          <span
                            className={clsx(
                              'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full',
                              item.badgeColor ||
                                'bg-[var(--bg-subtle)] text-[var(--on-surface-dim)]',
                            )}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Collapsed dot indicator for badge */}
                        {isCollapsed && item.badge && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Collapsed expansion button & status beacon */}
        {isCollapsed && (
          <div
            className="p-3 border-t flex flex-col items-center gap-2.5 shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={toggleSidebar}
              title="Expand sidebar (Ctrl+B)"
              className="p-2 rounded-xl text-[var(--on-surface-dim)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              <KeyboardDoubleArrowRightRounded sx={{ fontSize: 20 }} />
            </button>
            <div
              className="relative flex h-2.5 w-2.5 cursor-pointer"
              title="Telemetry Nominal · Local Engine Active"
              onClick={toggleSidebar}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[var(--color-success)]" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-success)]" />
            </div>
          </div>
        )}

        {/* ── Apple System Status Footer Card (Expanded) ──────────────────── */}
        {!isCollapsed && (
          <div
            className="p-3 border-t shrink-0 transition-all select-none"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="p-3 rounded-2xl border transition-all duration-200 group hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border-subtle))] shadow-xs"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-subtle) 60%, transparent)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* Top row: Status dot + Label + Uptime badge */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[var(--color-success)]" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
                  </span>
                  <span className="text-[11px] font-sans font-bold tracking-tight text-[var(--on-surface)] truncate">
                    Telemetry Nominal
                  </span>
                </div>
                <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-success)]/12 text-[var(--color-success)] border border-[var(--color-success)]/20 shrink-0">
                  99.9%
                </span>
              </div>

              {/* Bottom row: Node info + Apple-style keycap badge */}
              <div className="flex items-center justify-between pt-2 text-[10.5px]">
                <span className="font-mono text-[var(--on-surface-dim)] truncate">
                  Node v1 · 1.2ms
                </span>
                <button
                  onClick={toggleSidebar}
                  title="Collapse sidebar shortcut"
                  className="inline-flex items-center gap-1 cursor-pointer group-hover:text-[var(--primary)] text-[var(--on-surface-dim)] transition-colors shrink-0"
                >
                  <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[9.5px] font-mono font-semibold shadow-xs">
                    Ctrl+B
                  </kbd>
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Workspace Content Area ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top Header Bar across all viewports */}
        <NexisHeaderBar />

        {/* Dynamic Route Pages with Stable Viewport & Hardware-Accelerated Scoped Transitions */}
        <main
          className={clsx(
            'nexis-main-shell flex-1 min-h-0 flex flex-col',
            location.pathname.startsWith('/map') || location.pathname.startsWith('/topology')
              ? 'h-full overflow-hidden p-0'
              : 'overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain pb-24 md:pb-8'
          )}
        >
          <div
            className={clsx(
              'w-full flex-1 flex flex-col min-h-0',
              location.pathname.startsWith('/map') || location.pathname.startsWith('/topology')
                ? 'h-full'
                : 'min-h-full'
            )}
          >
            <Outlet />
          </div>
        </main>

        {/* ── Bottom Nav (Mobile Only) ─────────────────────────────────────── */}
        <nav
          className="nexis-mobile-nav-shell flex md:hidden border-t shrink-0 pb-safe backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              viewTransition
              className={({ isActive }) =>
                clsx(
                  'flex items-center flex-col gap-1 px-1 py-2 text-[10px] flex-1 justify-center transition-all duration-150 font-sans font-semibold select-none',
                  isActive
                    ? 'text-[var(--primary)] font-bold'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]',
                )
              }
            >
              <item.Icon sx={{ fontSize: 20 }} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

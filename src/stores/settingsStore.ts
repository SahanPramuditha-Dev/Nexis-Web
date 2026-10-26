import { create } from 'zustand'

export type ThemeMode = 'dark' | 'light'

export interface HomePrivacyGeofence {
  lat: number
  lng: number
  radiusM: number
  enabled: boolean
}

interface SettingsState {
  theme: ThemeMode
  openCellIdToken: string
  shareCrowdsourcedTelemetry: boolean
  enableCoordinateFuzzing: boolean
  maskIpAddress: boolean
  ephemeralProbeId: string
  homeGeofence: HomePrivacyGeofence | null
  contributedTestCount: number
  minKAnonymity: number
  toggleTheme(event?: React.MouseEvent): void
  setOpenCellIdToken(token: string): void
  setShareCrowdsourcedTelemetry(enabled: boolean): void
  setEnableCoordinateFuzzing(enabled: boolean): void
  setMaskIpAddress(enabled: boolean): void
  setHomeGeofence(geofence: HomePrivacyGeofence | null): void
  incrementContributedTestCount(): number
  setMinKAnonymity(k: number): void
  regenerateProbeId(): string
}

function getStoredTheme(): ThemeMode {
  const saved = localStorage.getItem('nexis-theme') as ThemeMode | null
  if (saved === 'dark' || saved === 'light') return saved
  return 'dark'
}

function getStoredToken(): string {
  try {
    const envToken = import.meta.env.VITE_OPENCELLID_API_KEY as string | undefined
    const localToken = localStorage.getItem('nexis-opencellid-token') || ''
    return localToken || envToken || ''
  } catch {
    return ''
  }
}

function generateRandomHex(len = 12): string {
  const bytes = new Uint8Array(len / 2)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(16).slice(2, 2 + len)
}

function getOrGenerateProbeId(): string {
  try {
    const existing = localStorage.getItem('nexis-ephemeral-probe-id')
    if (existing) return existing
    const newId = `probe-anon-${generateRandomHex(12)}`
    localStorage.setItem('nexis-ephemeral-probe-id', newId)
    return newId
  } catch {
    return `probe-anon-${generateRandomHex(12)}`
  }
}

function getStoredBoolean(key: string, defaultVal: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return defaultVal
    return v === 'true'
  } catch {
    return defaultVal
  }
}

function applyThemeToDOM(next: ThemeMode) {
  document.documentElement.setAttribute('data-theme', next)
  if (next === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
  document.documentElement.style.colorScheme = next
  try {
    localStorage.setItem('nexis-theme', next)
  } catch {}
}

function getStoredJson<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultVal
    return JSON.parse(raw) as T
  } catch {
    return defaultVal
  }
}

function getStoredNumber(key: string, defaultVal: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return defaultVal
    const n = Number(v)
    return isNaN(n) ? defaultVal : n
  } catch {
    return defaultVal
  }
}

// Initial bootstrap
const initialTheme = getStoredTheme()
applyThemeToDOM(initialTheme)

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: initialTheme,
  openCellIdToken: getStoredToken(),
  shareCrowdsourcedTelemetry: getStoredBoolean('nexis-crowdsource-telemetry', true),
  enableCoordinateFuzzing: getStoredBoolean('nexis-coordinate-fuzzing', true),
  maskIpAddress: getStoredBoolean('nexis-mask-ip', true),
  ephemeralProbeId: getOrGenerateProbeId(),
  homeGeofence: getStoredJson<HomePrivacyGeofence | null>('nexis-home-geofence', null),
  contributedTestCount: getStoredNumber('nexis-contributed-tests', 0),
  minKAnonymity: getStoredNumber('nexis-min-k-anonymity', 2),

  setOpenCellIdToken: (token: string) => {
    try {
      localStorage.setItem('nexis-opencellid-token', token.trim())
    } catch {}
    set({ openCellIdToken: token.trim() })
  },

  setShareCrowdsourcedTelemetry: (enabled: boolean) => {
    try {
      localStorage.setItem('nexis-crowdsource-telemetry', String(enabled))
    } catch {}
    set({ shareCrowdsourcedTelemetry: enabled })
  },

  setEnableCoordinateFuzzing: (enabled: boolean) => {
    try {
      localStorage.setItem('nexis-coordinate-fuzzing', String(enabled))
    } catch {}
    set({ enableCoordinateFuzzing: enabled })
  },

  setMaskIpAddress: (enabled: boolean) => {
    try {
      localStorage.setItem('nexis-mask-ip', String(enabled))
    } catch {}
    set({ maskIpAddress: enabled })
  },

  setHomeGeofence: (geofence: HomePrivacyGeofence | null) => {
    try {
      if (geofence) {
        localStorage.setItem('nexis-home-geofence', JSON.stringify(geofence))
      } else {
        localStorage.removeItem('nexis-home-geofence')
      }
    } catch {}
    set({ homeGeofence: geofence })
  },

  incrementContributedTestCount: () => {
    const next = (get().contributedTestCount || 0) + 1
    try {
      localStorage.setItem('nexis-contributed-tests', String(next))
    } catch {}
    set({ contributedTestCount: next })
    return next
  },

  setMinKAnonymity: (k: number) => {
    try {
      localStorage.setItem('nexis-min-k-anonymity', String(k))
    } catch {}
    set({ minKAnonymity: k })
  },

  regenerateProbeId: () => {
    const newId = `probe-anon-${generateRandomHex(12)}`
    try {
      localStorage.setItem('nexis-ephemeral-probe-id', newId)
    } catch {}
    set({ ephemeralProbeId: newId })
    return newId
  },

  toggleTheme: (event?: React.MouseEvent) => {
    const current = get().theme
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark'

    // Modern Circular Radial Ripple with View Transitions API (Chrome 111+, Edge, Safari 18+)
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      event
    ) {
      const x = event.clientX
      const y = event.clientY
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      // Temporarily mark root to disable partial CSS color interpolation during screenshot capture
      document.documentElement.classList.add('theme-transitioning')

      const transition = (document as any).startViewTransition(() => {
        applyThemeToDOM(next)
        set({ theme: next })
      })

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 380,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        )
      })

      transition.finished.finally(() => {
        document.documentElement.classList.remove('theme-transitioning')
      })
    } else {
      // Fallback crossfade
      applyThemeToDOM(next)
      set({ theme: next })
    }
  },
}))

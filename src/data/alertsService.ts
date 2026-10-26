/**
 * NEXIS System Alert Service
 * Manages local incidents, watchdog notifications, and SLA telemetry alerts.
 */

export interface AlertItem {
  id: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  timestamp: string
  source: string
  acknowledged: boolean
  metric?: string
  toolAction?: string
}

const STORAGE_KEY = 'nexis_system_alerts'

export const INITIAL_DEFAULT_ALERTS: AlertItem[] = [
  {
    id: 'alt-1',
    title: 'WAN Jitter Spike Detected',
    description: 'Gateway telemetry observed bufferbloat jitter exceeding 45ms during burst downlink traffic.',
    severity: 'warning',
    timestamp: '4 mins ago',
    source: 'Speed Engine Probe',
    acknowledged: false,
    metric: '48.2 ms jitter',
    toolAction: 'speed-diagnostic',
  },
  {
    id: 'alt-2',
    title: '5 GHz Radio Co-Channel Interference',
    description: 'Channel 36 detected 3 competing neighbor BSSIDs causing -14 dB SINR degradation.',
    severity: 'warning',
    timestamp: '18 mins ago',
    source: 'Wi-Fi Channel Analyzer',
    acknowledged: false,
    metric: 'Channel 36 Congested',
    toolAction: 'wifi-analyzer',
  },
  {
    id: 'alt-3',
    title: 'Carrier 5G SA Handover Latency Spike',
    description: 'Base station PCI #402 cell handover experienced momentary 120ms RTT hold.',
    severity: 'critical',
    timestamp: '1 hour ago',
    source: 'Cellular GIS Daemon',
    acknowledged: false,
    metric: 'RSRP -108 dBm',
    toolAction: 'doctor',
  },
  {
    id: 'alt-4',
    title: 'Public DNS Anycast RTT Optimized',
    description: 'DNS probe switched resolver target from 1.1.1.1 to 8.8.8.8 after routing path change.',
    severity: 'info',
    timestamp: '3 hours ago',
    source: 'Network Doctor',
    acknowledged: true,
    metric: '11 ms latency',
    toolAction: 'dns-benchmark',
  },
]

export function getStoredAlerts(): AlertItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_ALERTS))
      return INITIAL_DEFAULT_ALERTS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_DEFAULT_ALERTS
  }
}

export function saveStoredAlerts(alerts: AlertItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
    window.dispatchEvent(new Event('nexis_alerts_updated'))
  } catch (err) {
    console.warn('[AlertsService] Failed to persist alerts:', err)
  }
}

export function addAlert(newAlert: {
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  source: string
  metric?: string
  toolAction?: string
}): AlertItem {
  const alerts = getStoredAlerts()
  const created: AlertItem = {
    id: `alt-${Date.now()}`,
    timestamp: 'Just now',
    acknowledged: false,
    ...newAlert,
  }
  const updated = [created, ...alerts.slice(0, 49)]
  saveStoredAlerts(updated)
  return created
}

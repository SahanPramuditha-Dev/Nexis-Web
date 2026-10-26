import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { divIcon, type Map as LeafletMap } from 'leaflet'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  Polygon,
  useMap,
} from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

import NavigationRounded from '@mui/icons-material/NavigationRounded'
import WhatshotRounded from '@mui/icons-material/WhatshotRounded'
import SensorsRounded from '@mui/icons-material/SensorsRounded'
import ShieldRounded from '@mui/icons-material/ShieldRounded'
import MyLocationRounded from '@mui/icons-material/MyLocationRounded'
import LayersRounded from '@mui/icons-material/LayersRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import CenterFocusStrongRounded from '@mui/icons-material/CenterFocusStrongRounded'
import ZoomOutMapRounded from '@mui/icons-material/ZoomOutMapRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import LaunchRounded from '@mui/icons-material/LaunchRounded'
import BarChartRounded from '@mui/icons-material/BarChartRounded'
import PlaceRounded from '@mui/icons-material/PlaceRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import LeaderboardRounded from '@mui/icons-material/LeaderboardRounded'
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import PaletteRounded from '@mui/icons-material/PaletteRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import SportsEsportsRounded from '@mui/icons-material/SportsEsportsRounded'
import TvRounded from '@mui/icons-material/TvRounded'
import VideoCameraFrontRounded from '@mui/icons-material/VideoCameraFrontRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import RestartAltRounded from '@mui/icons-material/RestartAltRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowUpRounded from '@mui/icons-material/KeyboardArrowUpRounded'
import CloudSyncRounded from '@mui/icons-material/CloudSyncRounded'
import GroupWorkRounded from '@mui/icons-material/GroupWorkRounded'
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded'

import {
  getAllMeasurements,
  updateMeasurement,
  deleteMeasurement,
  clearAllMeasurements,
} from '@/data/db'
import { formatMbps, formatMs, type MeasurementRecord, type LocationSnapshot } from '@/data/models'
import { detectClientCarrier, type CarrierIdentity } from '@/data/carrierService'
import { fetchTowersInBoundingBox, BUNDLED_REAL_TOWERS } from '@/data/openCellIdService'
import {
  fetchCrowdsourcedCoverageCells,
  subscribeToCrowdsourceUpdates,
  subscribeToLiveTelemetryStream,
  generateMockLiveTelemetryEvent,
  type LiveTelemetryEvent,
  checkSupabaseConnection,
} from '@/data/supabaseClient'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  type CellTowerSite,
  getBasemapTiles,
  getMetricColor,
  findNearestTower,
  haversineDistanceMeters,
  clusterPersonalRecords,
  type PersonalCluster,
  type S2CoverageCell,
  type BasemapMode,
  getSectorWedgeCoordinates,
  getHexagonCoordinates,
} from './mapData'
import {
  CarrierMatrixModal,
  ElevationProfileDrawer,
  LiveTelemetryDrawer,
  RfOverlaysMenu,
  RoutePlaybackBar,
  NodeSparkline,
  type RfOverlaySettings,
} from './components'
import { computeCarrierMatrix, computeCarrierMatrixFromMeasurements } from './utils/carrierScoring'
import { computeQoE } from './utils/qoeScoring'
import { exportToGeoJson, exportToCsv } from './utils/geoExport'

/** Map controller for handling programmatic fly-to, zooming, and resizing */
function MapController({
  targetCenter,
  targetZoom,
  onResetComplete,
  onMapReady,
  onZoomChange,
  onMoveEnd,
}: {
  targetCenter: [number, number] | null
  targetZoom?: number
  onResetComplete?: () => void
  onMapReady?: (map: LeafletMap) => void
  onZoomChange?: (zoom: number) => void
  onMoveEnd?: () => void
}) {
  const map = useMap()

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }
    if (onZoomChange) {
      onZoomChange(map.getZoom())
    }
  }, [map, onMapReady, onZoomChange])

  useEffect(() => {
    if (!onZoomChange) return
    const handleZoom = () => onZoomChange(map.getZoom())
    map.on('zoomend', handleZoom)
    return () => {
      map.off('zoomend', handleZoom)
    }
  }, [map, onZoomChange])

  useEffect(() => {
    if (!onMoveEnd) return
    map.on('moveend', onMoveEnd)
    return () => {
      map.off('moveend', onMoveEnd)
    }
  }, [map, onMoveEnd])

  useEffect(() => {
    if (targetCenter) {
      map.invalidateSize()
      map.flyTo(targetCenter, targetZoom || map.getZoom(), {
        duration: 1.2,
        easeLinearity: 0.25,
      })
      onResetComplete?.()
    }
  }, [targetCenter, targetZoom, map, onResetComplete])

  useEffect(() => {
    const container = map.getContainer()
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(container)

    // Force multiple invalidate passes to ensure tiles cover 100% of height after layout/fonts/animation settles
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    const t3 = setTimeout(() => map.invalidateSize(), 600)
    const t4 = setTimeout(() => map.invalidateSize(), 1200)

    return () => {
      resizeObserver.disconnect()
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [map])

  return null
}

/** Custom on-map zoom buttons for glass UI */
function MapFloatingZoom({
  onZoomIn,
  onZoomOut,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border shadow-lg backdrop-blur-xl bg-[var(--surface)]/95 border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={onZoomIn}
        className="p-2.5 text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        title="Zoom In"
      >
        <AddRounded sx={{ fontSize: 18 }} />
      </button>
      <div className="h-[1px] bg-[var(--border-subtle)] w-full" />
      <button
        type="button"
        onClick={onZoomOut}
        className="p-2.5 text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <RemoveRounded sx={{ fontSize: 18 }} />
      </button>
    </div>
  )
}

export function MapPage() {
  const theme = useSettingsStore((s) => s.theme)
  const openCellIdToken = useSettingsStore((s) => s.openCellIdToken)
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(12)
  const [activeTowers, setActiveTowers] = useState<CellTowerSite[]>(BUNDLED_REAL_TOWERS)
  const [personalRecords, setPersonalRecords] = useState<MeasurementRecord[]>([])
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [mapMode, setMapMode] = useState<'personal' | 'heatmap'>('personal')
  const [crowdsourcedCells, setCrowdsourcedCells] = useState<S2CoverageCell[]>([])
  const [isFetchingCrowdCells, setIsFetchingCrowdCells] = useState(false)
  const shareCrowdsourcedTelemetry = useSettingsStore((s) => s.shareCrowdsourcedTelemetry)
  const setShareCrowdsourcedTelemetry = useSettingsStore((s) => s.setShareCrowdsourcedTelemetry)
  const contributedTestCount = useSettingsStore((s) => s.contributedTestCount)
  const [selectedTech, setSelectedTech] = useState<'All' | 'Wi-Fi' | '5G' | 'Fiber' | 'Cellular'>('All')
  const [selectedCarrier, setSelectedCarrier] = useState<string>('All')
  const [selectedMetric, setSelectedMetric] = useState<'Download' | 'Upload' | 'Latency' | 'Jitter'>('Download')
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'All' | 'Day' | 'Peak' | 'Night'>('All')
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<'30d' | '90d' | 'all'>('all')
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('auto')
  const [showBasemapMenu, setShowBasemapMenu] = useState(false)
  const [showStatsHud, setShowStatsHud] = useState(true)
  const [statsHudCollapsed, setStatsHudCollapsed] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // RF Infrastructure Overlay Settings (Default false for synthetic towers/laser to only show real user path)
  const [rfSettings, setRfSettings] = useState<RfOverlaySettings>({
    showRouteTrajectory: true,
    showCellTowers: false,
    showServingLaser: false,
    showSignalAura: true,
    showElevationProfile: false,
    showSpeedCorridor: true,
    showSectorWedges: false,
    carrierFilter: 'all',
  })
  const [showRfMenu, setShowRfMenu] = useState(false)

  // Carrier Matrix Modal State
  const [showCarrierMatrixModal, setShowCarrierMatrixModal] = useState(false)

  // Drive-Test Playback State
  const [showRoutePlayback, setShowRoutePlayback] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState(0)

  // FlyTo target state
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null)
  const [mapViewportEpoch, setMapViewportEpoch] = useState(0)

  // Crowdsource Map Enhancements: Hex Bin Layer & Live Telemetry Feed
  const [coverageMeshStyle, setCoverageMeshStyle] = useState<'hex' | 'aura' | 'both'>('hex')
  const [showLiveDrawer, setShowLiveDrawer] = useState(false)
  const [liveEvents, setLiveEvents] = useState<LiveTelemetryEvent[]>([])
  const [isLiveStreaming, setIsLiveStreaming] = useState(true)
  const [isSimulationActive, setIsSimulationActive] = useState(false)
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false)
  const [activePingWaves, setActivePingWaves] = useState<
    Array<{ id: string; lat: number; lng: number; color: string; speed: number }>
  >([])

  // User Geolocation state
  const [userLocation, setUserLocation] = useState<{
    coords: [number, number]
    accuracy: number
  } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locatingError, setLocatingError] = useState<string | null>(null)
  const [unlocatedCount, setUnlocatedCount] = useState<number>(0)
  const [isMappingUnlocated, setIsMappingUnlocated] = useState(false)

  // Inspector state
  const [resolvedCarrier, setResolvedCarrier] = useState<CarrierIdentity | null>(null)
  const [inspectedPersonal, setInspectedPersonal] = useState<MeasurementRecord | null>(null)
  const [inspectedCluster, setInspectedCluster] = useState<PersonalCluster | null>(null)
  const [inspectedCell, setInspectedCell] = useState<S2CoverageCell | null>(null)
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null)
  const [copiedCoords, setCopiedCoords] = useState(false)

  // Load measurements strictly from local IndexedDB and consolidate stationary tests
  const loadRecords = useCallback(async () => {
    // 1. Resolve true client carrier/ISP & ASN
    const carrier = await detectClientCarrier().catch(() => null)
    if (carrier) {
      setResolvedCarrier(carrier)
    }

    const all = await getAllMeasurements()

    // 2. Backfill existing records that lack ISP or have generic broadband tags
    for (const rec of all) {
      let changed = false
      const changes: Partial<MeasurementRecord> = {}
      if (!rec.isp && carrier?.isp) {
        rec.isp = carrier.isp
        rec.asn = carrier.asn || undefined
        rec.asnOrg = carrier.org || undefined
        changes.isp = carrier.isp
        changes.asn = carrier.asn || undefined
        changes.asnOrg = carrier.org || undefined
        changed = true
      }

      // Upgrade tags to Fiber if carrier is SLT-Mobitel AS9329 or Sri Lanka Telecom fixed broadband
      const isSltFixed =
        rec.asn === 9329 ||
        carrier?.asn === 9329 ||
        (rec.isp && /slt-mobitel/i.test(rec.isp) && !/cellular|mobile|lte/i.test(rec.isp)) ||
        (carrier?.isp && /slt-mobitel/i.test(carrier.isp) && carrier.connectionType === 'Fiber')

      if (isSltFixed) {
        const currentTags = rec.tags || []
        if (!currentTags.some((t) => t.toLowerCase() === 'fiber')) {
          const updatedTags = currentTags.filter((t) => t.toLowerCase() !== 'broadband' && t.toLowerCase() !== '3g')
          updatedTags.unshift('Fiber')
          rec.tags = updatedTags
          changes.tags = updatedTags
          changed = true
        }
      } else if (rec.tags && rec.tags.some((t) => t.toLowerCase() === '3g')) {
        const cleanTags = rec.tags.filter((t) => t.toLowerCase() !== '3g')
        const connType = carrier?.connectionType || (rec.downloadMbps && rec.downloadMbps > 50 ? 'Fiber' : 'Broadband')
        cleanTags.push(connType)
        rec.tags = cleanTags
        changes.tags = cleanTags
        changed = true
      }
      if (changed) {
        updateMeasurement(rec.id, changes).catch(() => {})
      }
    }

    const located = all.filter((r) => r.location && typeof r.location.lat === 'number')
    const unlocated = all.filter((r) => !r.location || typeof r.location.lat !== 'number')

    // If records were previously dispersed in a spiral, collapse them back to their single true location centroid
    if (located.length > 1) {
      const clusters = clusterPersonalRecords(located, 250)
      for (const cluster of clusters) {
        if (cluster.records.length > 1) {
          const [cLat, cLng] = cluster.center
          for (const rec of cluster.records) {
            if (rec.location && (Math.abs(rec.location.lat - cLat) > 0.000005 || Math.abs(rec.location.lng - cLng) > 0.000005)) {
              const updatedLoc: LocationSnapshot = {
                ...rec.location,
                lat: Number(cLat.toFixed(6)),
                lng: Number(cLng.toFixed(6)),
              }
              rec.location = updatedLoc
              updateMeasurement(rec.id, { location: updatedLoc })
            }
          }
        }
      }
    }

    setPersonalRecords(located)
    setUnlocatedCount(unlocated.length)

    // If there are unlocated records, proactively map them to the device's true location
    if (unlocated.length > 0 && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const baseLat = Number(pos.coords.latitude.toFixed(6))
          const baseLng = Number(pos.coords.longitude.toFixed(6))
          const accuracy = Math.round(pos.coords.accuracy || 20)

          const backfilled = await Promise.all(
            unlocated.map(async (rec) => {
              const loc: LocationSnapshot = {
                lat: baseLat,
                lng: baseLng,
                accuracyM: accuracy,
                precision: accuracy < 30 ? 'precise' : 'approximate',
              }
              await updateMeasurement(rec.id, { location: loc })
              return { ...rec, location: loc }
            })
          )

          const combined = [...located, ...backfilled].sort((a, b) => b.timestamp - a.timestamp)
          setPersonalRecords(combined)
          setUnlocatedCount(0)
          setUserLocation({ coords: [baseLat, baseLng], accuracy })
          setFlyTarget({ center: [baseLat, baseLng], zoom: 15 })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // Explicit handler to map tests directly to single true coordinate
  const handleMapUnlocatedTests = async (customCoords?: [number, number]) => {
    setIsMappingUnlocated(true)
    const assignCoords = async (baseLat: number, baseLng: number, accuracy: number) => {
      const all = await getAllMeasurements()
      const unlocated = all.filter((r) => !r.location || typeof r.location.lat !== 'number')
      const located = all.filter((r) => r.location && typeof r.location.lat === 'number')

      const fixedLat = Number(baseLat.toFixed(6))
      const fixedLng = Number(baseLng.toFixed(6))

      const backfilled = await Promise.all(
        unlocated.map(async (rec) => {
          const loc: LocationSnapshot = {
            lat: fixedLat,
            lng: fixedLng,
            accuracyM: accuracy,
            precision: accuracy < 30 ? 'precise' : 'approximate',
          }
          await updateMeasurement(rec.id, { location: loc })
          return { ...rec, location: loc }
        })
      )

      const combined = [...located, ...backfilled].sort((a, b) => b.timestamp - a.timestamp)
      setPersonalRecords(combined)
      setUnlocatedCount(0)
      setUserLocation({ coords: [fixedLat, fixedLng], accuracy })
      setFlyTarget({ center: [fixedLat, fixedLng], zoom: 15 })
      setIsMappingUnlocated(false)
    }

    if (customCoords) {
      await assignCoords(customCoords[0], customCoords[1], 25)
      return
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await assignCoords(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 20))
        },
        async () => {
          await assignCoords(6.9271, 79.8612, 50)
        },
        { enableHighAccuracy: true, timeout: 6000 }
      )
    } else {
      await assignCoords(6.9271, 79.8612, 50)
    }
  }

  // Clear all old/stored measurements from IndexedDB
  const handleClearAllData = async () => {
    await clearAllMeasurements()
    setPersonalRecords([])
    setUnlocatedCount(0)
    setInspectedPersonal(null)
    setInspectedCluster(null)
    setShowClearConfirm(false)
  }

  // Active personal records are strictly real data only
  const activePersonalRecords = personalRecords

  // Filtered personal records with technology & time-of-day criteria
  const filteredPersonalRecords = useMemo(() => {
    return activePersonalRecords.filter((rec) => {
      if (!rec.location) return false

      // Intelligent technology matching:
      // 1. Checks explicit tags ('Wi-Fi', 'Fiber', 'Cellular', '5G')
      // 2. Inferred connection type from carrier (SLT-Mobitel Mobile, Dialog 4G, Fiber Broadband)
      // 3. Fallback to physical medium heuristic (throughput > 100M is Fiber/5G tier, Wi-Fi local routing)
      if (selectedTech !== 'All') {
        const query = selectedTech.toLowerCase()
        const hasTag = rec.tags?.some((t) => t.toLowerCase().includes(query))
        const hasColo = rec.colo?.toLowerCase().includes(query)
        const hasIspMatch = rec.isp?.toLowerCase().includes(query)

        // Wi-Fi heuristic: desktop/browser tests or local network
        const isWiFi =
          query === 'wi-fi' &&
          (hasTag ||
            rec.tags?.some((t) => /wifi|wi-fi|broadband|fiber/i.test(t)) ||
            (rec.isp && !/cellular|mobile|gsm|lte/i.test(rec.isp)))

        // 5G heuristic: ultra-fast cellular or 5G tag
        const is5G =
          query === '5g' &&
          (hasTag ||
            (rec.downloadMbps && rec.downloadMbps >= 100 && /mobitel|dialog|airtel/i.test(rec.isp || '')))

        // Cellular heuristic: mobile operators
        const isCellular =
          query === 'cellular' &&
          (hasTag || /mobitel|dialog|airtel|hutch|cellular|mobile/i.test(rec.isp || ''))

        // Fiber heuristic
        const isFiber =
          query === 'fiber' &&
          (hasTag || /fiber|fibre|ftth/i.test(rec.isp || '') || (rec.downloadMbps && rec.downloadMbps >= 100))

        if (!hasTag && !hasColo && !hasIspMatch && !isWiFi && !is5G && !isCellular && !isFiber) {
          return false
        }
      }

      if (selectedTimeOfDay !== 'All') {
        const hour = new Date(rec.timestamp).getHours()
        if (selectedTimeOfDay === 'Day' && (hour < 6 || hour >= 18)) return false
        if (selectedTimeOfDay === 'Peak' && (hour < 18 || hour >= 23)) return false
        if (selectedTimeOfDay === 'Night' && (hour >= 6 && hour < 23)) return false
      }

      return true
    })
  }, [activePersonalRecords, selectedTech, selectedTimeOfDay])

  // Active filter count and reset handler
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedTech !== 'All') count++
    if (selectedMetric !== 'Download') count++
    if (selectedTimeOfDay !== 'All') count++
    if (selectedCarrier !== 'All') count++
    return count
  }, [selectedTech, selectedMetric, selectedTimeOfDay, selectedCarrier])

  const handleResetFilters = useCallback(() => {
    setSelectedTech('All')
    setSelectedMetric('Download')
    setSelectedTimeOfDay('All')
    setSelectedCarrier('All')
  }, [])

  // Consolidated location clusters (combines stationary tests at your desk/house into 1 clean node)
  const personalClusters = useMemo(() => {
    return clusterPersonalRecords(filteredPersonalRecords, 150)
  }, [filteredPersonalRecords])

  // Merged heatmap cells (strictly genuine crowdsourced cells from database + verified local test nodes)
  const allHeatmapCells = useMemo(() => {
    const map = new Map<string, S2CoverageCell>()

    // 1. Live crowdsourced cells from remote telemetry database (measurements / telemetry_records)
    for (const live of crowdsourcedCells) {
      map.set(live.cellToken, live)
    }

    // 2. Synthesize user's personal located tests as local verified S2 coverage cells
    // Ensures any test the user has run locally is automatically reflected on the heatmap grid
    if (activePersonalRecords.length > 0) {
      const located = activePersonalRecords.filter((r) => r.location && typeof r.location.lat === 'number')
      if (located.length > 0) {
        const clusters = clusterPersonalRecords(located, 350)
        clusters.forEach((cluster, idx) => {
          const recs = cluster.records
          if (recs.length === 0) return
          const avgDown = recs.reduce((acc, r) => acc + (r.downloadMbps || 0), 0) / recs.length
          const avgUp = recs.reduce((acc, r) => acc + (r.uploadMbps || 0), 0) / recs.length
          const avgPing = recs.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / recs.length
          const avgJitter = recs.reduce((acc, r) => acc + (r.jitterMs || 0), 0) / recs.length

          const firstIsp = recs[0].isp || 'SLT-Mobitel'
          const dominantTech: S2CoverageCell['dominantTech'] =
            recs.some((r) => r.tags?.some((t) => /5g/i.test(t)))
              ? '5G'
              : recs.some((r) => r.tags?.some((t) => /fiber|fibre/i.test(t))) || avgDown > 150
              ? 'Fiber'
              : recs.some((r) => r.tags?.some((t) => /wifi/i.test(t)))
              ? 'Wi-Fi'
              : '4G LTE'

          const token = `usr-${Math.round(cluster.center[0] * 1000)}-${Math.round(cluster.center[1] * 1000)}`
          const synthCell: S2CoverageCell = {
            id: `cell-usr-${idx}`,
            cellToken: token,
            center: cluster.center,
            radiusMeters: 550,
            avgDownloadMbps: Number(avgDown.toFixed(1)),
            avgUploadMbps: Number(avgUp.toFixed(1)),
            avgLatencyMs: Number(avgPing.toFixed(1)),
            avgJitterMs: Number(avgJitter.toFixed(1)),
            sampleCount: recs.length,
            dominantTech,
            dominantCarrier: `${firstIsp} (User Verified)`,
            quality: avgDown >= 100 ? 'Excellent' : avgDown >= 30 ? 'Good' : 'Fair',
            city: 'Local Verified Node',
            isLiveCrowdsourced: true,
            isBaselineSeed: false,
          }
          map.set(token, synthCell)
        })
      }
    }

    return Array.from(map.values())
  }, [crowdsourcedCells, activePersonalRecords])

  // Filtered heatmap cells
  const filteredHeatmapCells = useMemo(() => {
    return allHeatmapCells.filter((cell) => {
      if (selectedCarrier !== 'All' && !cell.dominantCarrier.toLowerCase().includes(selectedCarrier.toLowerCase())) {
        return false
      }
      if (selectedTech === 'All') return true
      if (selectedTech === 'Wi-Fi') return cell.dominantTech === 'Wi-Fi'
      if (selectedTech === '5G') return cell.dominantTech === '5G'
      if (selectedTech === 'Fiber') return cell.dominantTech === 'Fiber'
      if (selectedTech === 'Cellular') return cell.dominantTech === '4G LTE' || cell.dominantTech === '5G'
      return true
    })
  }, [allHeatmapCells, selectedTech, selectedCarrier])

  // Heatmap cells located strictly within the user's active viewport (falls back to filtered cells)
  const visibleHeatmapCells = useMemo(() => {
    if (!mapInstance) return filteredHeatmapCells
    try {
      const bounds = mapInstance.getBounds()
      const inView = filteredHeatmapCells.filter((c) =>
        bounds.contains([c.center[0], c.center[1]])
      )
      return inView.length > 0 ? inView : filteredHeatmapCells
    } catch {
      return filteredHeatmapCells
    }
  }, [mapInstance, filteredHeatmapCells, mapViewportEpoch])

  // Label indicating which area/district is currently in viewport
  const currentViewAreaName = useMemo(() => {
    if (visibleHeatmapCells.length > 0 && visibleHeatmapCells.length <= 12) {
      const cities = Array.from(new Set(visibleHeatmapCells.map((c) => c.city)))
      if (cities.length === 1) return `${cities[0]}`
      if (cities.length <= 3) return `${cities.join(' / ')}`
    }
    return 'Regional Grid'
  }, [visibleHeatmapCells])

  // Carrier benchmark matrix computation:
  // In Personal Mode: computed strictly from user's genuine measurements.
  // In Heatmap Mode: computed from public grid cells in the visible region.
  const carrierMatrix = useMemo(() => {
    if (mapMode === 'personal' && activePersonalRecords.length > 0) {
      return computeCarrierMatrixFromMeasurements(activePersonalRecords)
    }
    return computeCarrierMatrix(visibleHeatmapCells)
  }, [mapMode, activePersonalRecords, visibleHeatmapCells])

  // Aggregate stats computation strictly scoped to the active viewport
  const stats = useMemo(() => {
    if (mapMode === 'personal') {
      const count = filteredPersonalRecords.length
      if (count === 0) return { count: 0, avgDown: 0, avgPing: 0, topDown: 0 }
      const sumDown = filteredPersonalRecords.reduce((acc, r) => acc + (r.downloadMbps || 0), 0)
      const sumPing = filteredPersonalRecords.reduce((acc, r) => acc + (r.latencyMs || 0), 0)
      const maxDown = Math.max(...filteredPersonalRecords.map((r) => r.downloadMbps || 0))
      return {
        count,
        avgDown: sumDown / count,
        avgPing: sumPing / count,
        topDown: maxDown,
      }
    } else {
      const count = visibleHeatmapCells.length
      if (count === 0) return { count: 0, avgDown: 0, avgPing: 0, topDown: 0 }
      const sumDown = visibleHeatmapCells.reduce((acc, c) => acc + c.avgDownloadMbps, 0)
      const sumPing = visibleHeatmapCells.reduce((acc, c) => acc + c.avgLatencyMs, 0)
      const maxDown = Math.max(...visibleHeatmapCells.map((c) => c.avgDownloadMbps))
      return {
        count,
        avgDown: sumDown / count,
        avgPing: sumPing / count,
        topDown: maxDown,
      }
    }
  }, [mapMode, filteredPersonalRecords, visibleHeatmapCells])

  // Commute Route Geographic Span (Calculated between furthest personal clusters)
  const commuteSpanKm = useMemo(() => {
    if (personalClusters.length < 2) return null
    let maxDist = 0
    for (let i = 0; i < personalClusters.length; i++) {
      for (let j = i + 1; j < personalClusters.length; j++) {
        const c1 = personalClusters[i].center
        const c2 = personalClusters[j].center
        const d = haversineDistanceMeters(c1[0], c1[1], c2[0], c2[1])
        if (d > maxDist) maxDist = d
      }
    }
    return maxDist > 0 ? (maxDist / 1000).toFixed(1) : null
  }, [personalClusters])

  // Filter active towers by user-selected carrier in RF overlay menu
  const visibleTowers = useMemo(() => {
    if (rfSettings.carrierFilter === 'all') return activeTowers
    return activeTowers.filter((t) =>
      t.carrierName.toLowerCase().includes(rfSettings.carrierFilter)
    )
  }, [activeTowers, rfSettings.carrierFilter])

  // Sequential sorted personal clusters for trajectory path and speed corridor segments
  const sortedPersonalClusters = useMemo(() => {
    return [...personalClusters].sort(
      (a, b) => a.latestRecord.timestamp - b.latestRecord.timestamp
    )
  }, [personalClusters])

  // Serving Cell Tower Link & Laser Ray (Prioritizes genuine matching telecom operator)
  const servingLink = useMemo(() => {
    if (!rfSettings.showServingLaser) return null
    // Fallback: if user haven't clicked a node and geolocation isn't active, use latest test cluster location
    const fallbackTarget =
      sortedPersonalClusters.length > 0
        ? { lat: sortedPersonalClusters[sortedPersonalClusters.length - 1].center[0], lng: sortedPersonalClusters[sortedPersonalClusters.length - 1].center[1] }
        : null
    const target =
      inspectedPersonal?.location ||
      (userLocation ? { lat: userLocation.coords[0], lng: userLocation.coords[1] } : fallbackTarget)
    if (!target) return null

    // Match towers belonging to the user's real carrier if known (e.g. SLT-Mobitel vs Dialog)
    const userCarrier = inspectedPersonal?.isp || inspectedCluster?.latestRecord.isp || resolvedCarrier?.isp
    const towerPool = visibleTowers.length > 0 ? visibleTowers : BUNDLED_REAL_TOWERS
    const matchingTowers = userCarrier
      ? towerPool.filter(
          (t) =>
            t.carrierName.toLowerCase().includes(userCarrier.toLowerCase()) ||
            userCarrier.toLowerCase().includes(t.carrierName.toLowerCase())
        )
      : []
    const candidateTowers = matchingTowers.length > 0 ? matchingTowers : towerPool

    const nearest = findNearestTower(target.lat, target.lng, candidateTowers)
    if (!nearest) return null

    const userPt: [number, number] = [target.lat, target.lng]
    const towerPt: [number, number] = [nearest.tower.latitude, nearest.tower.longitude]
    const midPt: [number, number] = [(userPt[0] + towerPt[0]) / 2, (userPt[1] + towerPt[1]) / 2]

    const distText =
      nearest.distanceMeters >= 1000
        ? `${(nearest.distanceMeters / 1000).toFixed(1)} km`
        : `${nearest.distanceMeters} m`

    return { userPt, towerPt, midPt, distText, tower: nearest.tower }
  }, [inspectedPersonal, inspectedCluster, userLocation, sortedPersonalClusters, rfSettings.showServingLaser, resolvedCarrier, activeTowers, visibleTowers])

  // Tile layer setup
  const basemapTiles = useMemo(() => getBasemapTiles(theme), [theme])
  const activeTileConfig = basemapTiles[basemapMode] || basemapTiles.auto

  // Initial center computed as centroid of all personal records, or fallback to Colombo
  const defaultCenter: [number, number] = useMemo(() => {
    const validPoints = activePersonalRecords.filter(
      (r) =>
        r.location &&
        typeof r.location.lat === 'number' &&
        !isNaN(r.location.lat) &&
        typeof r.location.lng === 'number' &&
        !isNaN(r.location.lng)
    )
    if (validPoints.length > 0) {
      const sumLat = validPoints.reduce((acc, r) => acc + r.location!.lat, 0)
      const sumLng = validPoints.reduce((acc, r) => acc + r.location!.lng, 0)
      return [Number((sumLat / validPoints.length).toFixed(6)), Number((sumLng / validPoints.length).toFixed(6))]
    }
    return [6.9271, 79.8612]
  }, [activePersonalRecords])

  // Load real physical base stations based on viewport or current location
  const loadTowers = useCallback(async () => {
    if (!rfSettings.showCellTowers && !rfSettings.showServingLaser) return
    let bbox = {
      minLat: defaultCenter[0] - 0.25,
      maxLat: defaultCenter[0] + 0.25,
      minLng: defaultCenter[1] - 0.25,
      maxLng: defaultCenter[1] + 0.25,
    }
    if (mapInstance) {
      try {
        const b = mapInstance.getBounds()
        bbox = {
          minLat: b.getSouth(),
          maxLat: b.getNorth(),
          minLng: b.getWest(),
          maxLng: b.getEast(),
        }
      } catch {}
    }
    const towers = await fetchTowersInBoundingBox(bbox, openCellIdToken)
    setActiveTowers(towers.length > 0 ? towers : BUNDLED_REAL_TOWERS)
  }, [rfSettings.showCellTowers, rfSettings.showServingLaser, defaultCenter, mapInstance, openCellIdToken])

  // Load dynamic crowdsourced coverage cells within the current viewport
  const loadCrowdsourcedCells = useCallback(async () => {
    if (mapMode !== 'heatmap') return
    let bbox = {
      minLat: defaultCenter[0] - 0.25,
      maxLat: defaultCenter[0] + 0.25,
      minLng: defaultCenter[1] - 0.25,
      maxLng: defaultCenter[1] + 0.25,
    }
    if (mapInstance) {
      try {
        const b = mapInstance.getBounds()
        bbox = {
          minLat: b.getSouth(),
          maxLat: b.getNorth(),
          minLng: b.getWest(),
          maxLng: b.getEast(),
        }
      } catch {}
    }
    setIsFetchingCrowdCells(true)
    try {
      const liveCells = await fetchCrowdsourcedCoverageCells(bbox, selectedCarrier, selectedTech, selectedTimeWindow)
      if (liveCells && liveCells.length > 0) {
        setCrowdsourcedCells(liveCells)
      }
    } catch (err) {
      console.warn('[Map] Crowdsourced cell load error:', err)
    } finally {
      setIsFetchingCrowdCells(false)
    }
  }, [mapMode, mapInstance, defaultCenter, selectedCarrier, selectedTech, selectedTimeWindow])

  useEffect(() => {
    loadTowers()
  }, [loadTowers])

  useEffect(() => {
    if (mapMode === 'heatmap') {
      loadCrowdsourcedCells()
      // Realtime subscription: When admin changes rules, approves, or quarantines records, refresh grid
      const unsub = subscribeToCrowdsourceUpdates(() => {
        loadCrowdsourcedCells()
      })
      return () => unsub()
    }
  }, [mapMode, loadCrowdsourcedCells])

  // Check Supabase connection status for live WebSocket readiness
  useEffect(() => {
    checkSupabaseConnection().then((res) => {
      setIsSupabaseConnected(res.connected)
      // Auto-enable simulation if Supabase is not connected so user immediately sees live activity
      if (!res.connected) {
        setIsSimulationActive(true)
      }
    })
  }, [])

  // Live WebSocket stream listener for incoming crowdsourced telemetry packets
  useEffect(() => {
    if (!isLiveStreaming) return

    const unsub = subscribeToLiveTelemetryStream((event) => {
      setLiveEvents((prev) => [event, ...prev.slice(0, 49)])

      // Trigger animated map ping ripple wave
      const pingId = `wave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const color =
        event.networkType === '5G'
          ? '#10B981'
          : event.networkType === 'WIFI'
          ? '#3B82F6'
          : '#F59E0B'

      setActivePingWaves((prev) => [
        ...prev,
        {
          id: pingId,
          lat: event.latitude,
          lng: event.longitude,
          color,
          speed: event.downloadMbps,
        },
      ])

      setTimeout(() => {
        setActivePingWaves((prev) => prev.filter((w) => w.id !== pingId))
      }, 5500)
    })

    return () => {
      unsub()
    }
  }, [isLiveStreaming])

  // Periodic mock probe simulation when simulation mode is active
  useEffect(() => {
    if (!isSimulationActive) return

    const interval = setInterval(() => {
      const mockEvent = generateMockLiveTelemetryEvent()
      setLiveEvents((prev) => [mockEvent, ...prev.slice(0, 49)])

      const pingId = `wave-sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const color =
        mockEvent.networkType === '5G'
          ? '#10B981'
          : mockEvent.networkType === 'WIFI'
          ? '#3B82F6'
          : '#F59E0B'

      setActivePingWaves((prev) => [
        ...prev,
        {
          id: pingId,
          lat: mockEvent.latitude,
          lng: mockEvent.longitude,
          color,
          speed: mockEvent.downloadMbps,
        },
      ])

      setTimeout(() => {
        setActivePingWaves((prev) => prev.filter((w) => w.id !== pingId))
      }, 5500)
    }, 4000)

    return () => clearInterval(interval)
  }, [isSimulationActive])

  const handleMapMoveEnd = useCallback(() => {
    setMapViewportEpoch((v) => v + 1)
    loadTowers()
    if (mapMode === 'heatmap') {
      loadCrowdsourcedCells()
    }
  }, [loadTowers, loadCrowdsourcedCells, mapMode])

  // Strategy 1: Auto-fit all personal test records in the viewport on initial load
  const hasAutoFittedRef = useRef(false)
  useEffect(() => {
    if (!mapInstance || hasAutoFittedRef.current) return
    const points: [number, number][] = personalClusters.map((c) => c.center)
    if (points.length === 0) return

    hasAutoFittedRef.current = true
    mapInstance.invalidateSize()
    if (points.length === 1) {
      mapInstance.flyTo(points[0], 15, { duration: 0.8 })
    } else {
      mapInstance.fitBounds(points, {
        padding: [80, 80],
        maxZoom: 15,
        animate: true,
        duration: 0.8,
      })
    }
  }, [mapInstance, personalClusters])

  // Locate User via HTML5 Geolocation API
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocatingError('Geolocation is not supported by your browser.')
      return
    }

    // Immediately fly if location is already known
    if (mapInstance) {
      mapInstance.invalidateSize()
      if (userLocation) {
        mapInstance.flyTo(userLocation.coords, 16, { duration: 1.0, easeLinearity: 0.25 })
      }
    }

    setIsLocating(true)
    setLocatingError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        const accuracy = Math.round(pos.coords.accuracy || 20)
        setUserLocation({ coords: [lat, lng], accuracy })

        if (mapInstance) {
          mapInstance.invalidateSize()
          mapInstance.flyTo([lat, lng], 16, { duration: 1.2, easeLinearity: 0.25 })
        } else {
          setFlyTarget({ center: [lat, lng], zoom: 16 })
        }
      },
      (err) => {
        setIsLocating(false)
        setLocatingError(err.message || 'Unable to retrieve location.')
        setTimeout(() => setLocatingError(null), 4000)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [mapInstance, userLocation])

  // Smart Camera Fit: Frames route bounds if multiple locations exist; centers directly if single point
  const handleSmartFit = useCallback(() => {
    if (!mapInstance) return
    mapInstance.invalidateSize()

    if (mapMode === 'heatmap') {
      if (filteredHeatmapCells.length === 0) {
        mapInstance.flyTo(userLocation?.coords || defaultCenter, 14, { duration: 1.0 })
        return
      }

      const centerRef =
        userLocation?.coords ||
        ([mapInstance.getCenter().lat, mapInstance.getCenter().lng] as [number, number])

      // Find regional cells within 60km of user or map center to avoid worldwide zoom-out
      const regionalCells = filteredHeatmapCells.filter((c) => {
        const d = haversineDistanceMeters(centerRef[0], centerRef[1], c.center[0], c.center[1])
        return d <= 60000
      })

      const targetCells = regionalCells.length > 0 ? regionalCells : filteredHeatmapCells.slice(0, 15)
      const points: [number, number][] = targetCells.map((c) => c.center)
      if (userLocation) points.push(userLocation.coords)

      if (points.length === 1) {
        mapInstance.flyTo(points[0], 15, { duration: 1.0 })
      } else {
        mapInstance.fitBounds(points, {
          padding: [70, 70],
          maxZoom: 15.5,
          animate: true,
          duration: 1.0,
        })
      }
      return
    }

    const points: [number, number][] = []
    if (userLocation) points.push(userLocation.coords)
    personalClusters.forEach((c) => points.push(c.center))

    if (points.length === 0) {
      mapInstance.flyTo(defaultCenter, 14, { duration: 1.0 })
      return
    }
    if (points.length === 1) {
      mapInstance.flyTo(points[0], 15.5, { duration: 1.0, easeLinearity: 0.25 })
    } else {
      mapInstance.fitBounds(points, {
        padding: [80, 80],
        maxZoom: 16,
        animate: true,
        duration: 1.0,
      })
    }
  }, [mapInstance, mapMode, filteredHeatmapCells, userLocation, personalClusters, defaultCenter])

  // Global Keyboard Shortcuts for GIS Map (F = Fit Route, L = Locate Me)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input or textarea
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        handleSmartFit()
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        handleLocateMe()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSmartFit, handleLocateMe])

  // Copy coordinates to clipboard
  const handleCopy = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    setCopiedCoords(true)
    setTimeout(() => setCopiedCoords(false), 2000)
  }

  // Handle Drive-test Playback Selection
  const handlePlaybackSelect = (index: number) => {
    setPlaybackIndex(index)
    const rec = filteredPersonalRecords[index]
    if (rec?.location) {
      setInspectedPersonal(rec)
      setFlyTarget({ center: [rec.location.lat, rec.location.lng], zoom: 15 })
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full min-h-0 select-none relative overflow-hidden bg-[var(--bg-canvas)]">
      {/* ── Top Floating Header & Filter Deck ──────────────────────────────── */}
      <div
        className={`absolute top-4 left-4 z-[1000] flex flex-col gap-2.5 pointer-events-none transition-all duration-300 ease-out ${
          inspectedPersonal || inspectedCluster || inspectedCell ? 'right-[424px]' : 'right-4'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Map Mode Selector (Personal Tests vs Public S2 Heatmap) */}
          <div className="flex items-center rounded-2xl p-1 border shadow-lg backdrop-blur-xl pointer-events-auto bg-[var(--surface)]/95 border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setMapMode('personal')
                setInspectedCell(null)
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                mapMode === 'personal'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
              }`}
            >
              <NavigationRounded sx={{ fontSize: 15 }} />
              <span>Personal Tests ({filteredPersonalRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMapMode('heatmap')
                setInspectedPersonal(null)
                // If map has no cells in current view, fit or fly to nearest regional coverage
                if (mapInstance && filteredHeatmapCells.length > 0) {
                  try {
                    const bounds = mapInstance.getBounds()
                    const hasCellInView = filteredHeatmapCells.some((c) =>
                      bounds.contains([c.center[0], c.center[1]])
                    )
                    if (!hasCellInView) {
                      const center = mapInstance.getCenter()
                      let closestCell = filteredHeatmapCells[0]
                      let minDist = Infinity
                      for (const cell of filteredHeatmapCells) {
                        const d = haversineDistanceMeters(center.lat, center.lng, cell.center[0], cell.center[1])
                        if (d < minDist) {
                          minDist = d
                          closestCell = cell
                        }
                      }
                      if (minDist <= 80000) {
                        mapInstance.flyTo(closestCell.center, 14, { duration: 0.8 })
                      }
                    }
                  } catch {}
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                mapMode === 'heatmap'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
              }`}
            >
              <WhatshotRounded sx={{ fontSize: 15 }} />
              <span>
                Public Heatmap ({filteredHeatmapCells.length} {filteredHeatmapCells.length === 1 ? 'Cell' : 'Cells'})
              </span>
              {crowdsourcedCells.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  LIVE
                </span>
              )}
            </button>
          </div>

          {/* Hex Mesh Style Switcher (Heatmap Mode) */}
          {mapMode === 'heatmap' && (
            <div className="hidden sm:flex items-center p-0.5 rounded-2xl bg-[var(--surface)]/95 border border-[var(--border-subtle)] shadow-md text-xs backdrop-blur-xl pointer-events-auto">
              <button
                type="button"
                onClick={() => setCoverageMeshStyle('hex')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  coverageMeshStyle === 'hex'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                }`}
                title="Discrete Hexagonal Grid (H3-style bins)"
              >
                Hex Bins
              </button>
              <button
                type="button"
                onClick={() => setCoverageMeshStyle('aura')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  coverageMeshStyle === 'aura'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                }`}
                title="Radial Coverage Auras"
              >
                Auras
              </button>
              <button
                type="button"
                onClick={() => setCoverageMeshStyle('both')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  coverageMeshStyle === 'both'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
                }`}
                title="Hybrid Hex Mesh & Radial Auras"
              >
                Both
              </button>
            </div>
          )}

          {/* Live Telemetry Feed Trigger Button */}
          <button
            type="button"
            onClick={() => setShowLiveDrawer(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-sans shadow-md backdrop-blur-xl bg-[var(--surface)]/95 border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all cursor-pointer pointer-events-auto"
            title="Open Live Realtime Telemetry Feed"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500/50 animate-ping" />
            </div>
            <span className="text-[11px] font-bold text-[var(--on-surface)]">Live Stream</span>
            {liveEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[var(--primary)] text-white">
                {liveEvents.length}
              </span>
            )}
          </button>

          {/* Crowdsourced Telemetry Status Pill */}
          <button
            type="button"
            onClick={() => setShareCrowdsourcedTelemetry(!shareCrowdsourcedTelemetry)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-sans shadow-md backdrop-blur-xl bg-[var(--surface)]/95 border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all cursor-pointer pointer-events-auto"
            title="Click to toggle crowdsourced telemetry sharing"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                shareCrowdsourcedTelemetry ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-semibold text-[var(--on-surface-muted)]">Crowd Telemetry:</span>
            <span className="text-[11px] font-mono font-bold text-[var(--primary)]">
              {shareCrowdsourcedTelemetry ? `${contributedTestCount} Contributed` : 'Paused'}
            </span>
          </button>

          {/* Spatial Tools */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* GIS Export Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExportMenu(!showExportMenu)
                  setShowBasemapMenu(false)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-sans font-bold shadow-md backdrop-blur-xl cursor-pointer bg-[var(--surface)]/95 border-[var(--border-subtle)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all"
                title="Export Spatial Telemetry"
              >
                <FileDownloadRounded sx={{ fontSize: 16, color: 'var(--primary)' }} />
                <span className="hidden sm:inline">Export GIS</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border shadow-2xl backdrop-blur-2xl p-1.5 flex flex-col gap-1 z-[1100] bg-[var(--surface)]/95 border-[var(--border-subtle)]">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 text-[var(--on-surface-dim)]">
                    Spatial Export
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      exportToGeoJson(
                        filteredPersonalRecords,
                        rfSettings.showCellTowers ? activeTowers : [],
                        filteredHeatmapCells
                      )
                      setShowExportMenu(false)
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                  >
                    <span>Full Layer (.geojson)</span>
                    <span className="text-[10px] font-mono text-[var(--primary)]">GIS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportToGeoJson([], [], filteredHeatmapCells)
                      setShowExportMenu(false)
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                  >
                    <span>Coverage Grid (.geojson)</span>
                    <span className="text-[10px] font-mono text-[var(--color-success)]">GRID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportToCsv(filteredPersonalRecords)
                      setShowExportMenu(false)
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans font-medium text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                  >
                    <span>Tabular (.csv)</span>
                    <span className="text-[10px] font-mono text-[var(--primary)]">CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Chips Bar, Metric Encoder & Drive-test Playback Trigger */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-1 pointer-events-auto">
          {/* Technology filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl border backdrop-blur-xl bg-[var(--surface)]/98 border-[var(--border-subtle)] shadow-md">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--on-surface-muted)] px-2.5 hidden sm:inline">
              TECH:
            </span>
            {(['All', 'Cellular', '5G', 'Fiber', 'Wi-Fi'] as const).map((tech) => (
              <button
                key={tech}
                type="button"
                onClick={() => setSelectedTech(tech)}
                className={`px-3 py-1 rounded-xl text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedTech === tech
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                }`}
                title={
                  tech === 'Cellular'
                    ? 'Filter to Mobile Cellular Only (4G LTE & 5G NR)'
                    : tech === 'Fiber'
                    ? 'Filter to Wireline Fiber (FTTH)'
                    : undefined
                }
              >
                {tech === 'Cellular' ? 'Cellular (4G/5G)' : tech === 'Fiber' ? 'Fiber (FTTH)' : tech}
              </button>
            ))}
          </div>

          {/* Metric color encoder selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl border backdrop-blur-xl bg-[var(--surface)]/98 border-[var(--border-subtle)] shadow-md">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--on-surface-muted)] px-2.5 hidden sm:inline">
              HEATMAP BY:
            </span>
            {(['Download', 'Upload', 'Latency', 'Jitter'] as const).map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 rounded-xl text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedMetric === metric
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>

          {/* Time-of-Day Congestion Filter (Personal Tests Mode) */}
          {mapMode === 'personal' && (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border backdrop-blur-xl bg-[var(--surface)]/98 border-[var(--border-subtle)] shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--on-surface-muted)] px-2.5 hidden sm:inline flex items-center gap-1">
                <ScheduleRounded sx={{ fontSize: 13 }} />
                <span>TIME:</span>
              </span>
              {(['All', 'Day', 'Peak', 'Night'] as const).map((tod) => (
                <button
                  key={tod}
                  type="button"
                  onClick={() => setSelectedTimeOfDay(tod)}
                  className={`px-3 py-1 rounded-xl text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedTimeOfDay === tod
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title={
                    tod === 'Day'
                      ? 'Daytime Tests (6 AM – 6 PM)'
                      : tod === 'Peak'
                      ? 'Peak Evening Congestion (6 PM – 11 PM)'
                      : tod === 'Night'
                      ? 'Off-Peak Overnight (11 PM – 6 AM)'
                      : 'All Test Hours'
                  }
                >
                  {tod === 'Day' ? 'Day (6A-6P)' : tod === 'Peak' ? 'Peak (6P-11P)' : tod === 'Night' ? 'Night (11P-6A)' : 'All Time'}
                </button>
              ))}
            </div>
          )}

          {/* Time-Window Telemetry Freshness Filter (Heatmap Mode) */}
          {mapMode === 'heatmap' && (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border backdrop-blur-xl bg-[var(--surface)]/98 border-[var(--border-subtle)] shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--on-surface-muted)] px-2.5 hidden sm:inline flex items-center gap-1">
                <ScheduleRounded sx={{ fontSize: 13 }} />
                <span>EPOCH:</span>
              </span>
              {[
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
                { id: 'all', label: 'All-Time' },
              ].map((tw) => (
                <button
                  key={tw.id}
                  type="button"
                  onClick={() => setSelectedTimeWindow(tw.id as any)}
                  className={`px-3 py-1 rounded-xl text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedTimeWindow === tw.id
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title={
                    tw.id === '30d'
                      ? 'Hot Layer: Real-time network health in past 30 days'
                      : tw.id === '90d'
                      ? 'Warm Layer: Quarterly performance baseline'
                      : 'Full historical telemetry dataset'
                  }
                >
                  {tw.label}
                </button>
              ))}
            </div>
          )}

          {/* Active Filter Indicator & Reset Action */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-2xl border text-[10.5px] font-sans font-bold backdrop-blur-xl cursor-pointer transition-all shadow-xs bg-[var(--surface)]/95 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
              title="Reset all active filters to default"
            >
              <RestartAltRounded sx={{ fontSize: 14 }} />
              <span>Reset Filters ({activeFilterCount})</span>
            </button>
          )}

          {/* Drive-Test Playback Launcher (Personal Tests Mode) */}
          {mapMode === 'personal' && filteredPersonalRecords.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowRoutePlayback(!showRoutePlayback)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[10.5px] font-sans font-bold backdrop-blur-xl cursor-pointer transition-all shadow-xs ${
                showRoutePlayback
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--surface)]/95 border-[var(--border-subtle)] text-[var(--primary)] hover:border-[var(--primary)]'
              }`}
              title="Replay drive-test route chronologically"
            >
              <PlayArrowRounded sx={{ fontSize: 16 }} />
              <span>Route Playback</span>
            </button>
          )}

          {/* Inline Speed Legend Dots (Hidden when inspector drawer is active to avoid crowding) */}
          {!(inspectedPersonal || inspectedCluster || inspectedCell) && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border backdrop-blur-xl bg-[var(--surface)]/98 border-[var(--border-subtle)] shadow-md text-[10px] font-sans">
              <span className="text-[9px] font-mono font-bold text-[var(--on-surface-muted)] uppercase mr-1">
                SCALE:
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="font-mono font-semibold text-[var(--on-surface)]">&ge;200M</span>
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] ml-1" />
              <span className="font-mono font-semibold text-[var(--on-surface)]">75M</span>
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] ml-1" />
              <span className="font-mono font-semibold text-[var(--on-surface)]">25M</span>
              <span className="w-2 h-2 rounded-full bg-[#EF4444] ml-1" />
              <span className="font-mono font-semibold text-[var(--on-surface)]">&lt;25M</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Route Playback Scrubber Bar ────────────────────────────── */}
      {showRoutePlayback && (
        <RoutePlaybackBar
          records={filteredPersonalRecords}
          currentIndex={playbackIndex}
          onSelectIndex={handlePlaybackSelect}
          onClose={() => setShowRoutePlayback(false)}
        />
      )}

      {/* ── Vertically-Centered Floating Map Action Tools (Right Edge) ──── */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2.5 pointer-events-auto transition-all duration-300 ease-out ${
          inspectedPersonal || inspectedCluster || inspectedCell ? 'right-[424px]' : 'right-4'
        }`}
      >
        {/* Capsule 1: Navigation & Camera Viewport Controls */}
        <div className="flex flex-col items-center rounded-2xl border shadow-xl backdrop-blur-2xl bg-[var(--surface)]/95 border-[var(--border-subtle)] p-1 gap-1">
          {/* Zoom In / Zoom Out */}
          <button
            type="button"
            onClick={() => mapInstance?.zoomIn()}
            className="p-2 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <AddRounded sx={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            onClick={() => mapInstance?.zoomOut()}
            className="p-2 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <RemoveRounded sx={{ fontSize: 18 }} />
          </button>

          <div className="w-5 h-[1px] bg-[var(--border-subtle)] my-0.5" />

          {/* Locate Me Button [Hotkey: L] */}
          <button
            type="button"
            onClick={handleLocateMe}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isLocating
                ? 'bg-[var(--primary)] text-white'
                : userLocation
                ? 'bg-[var(--primary)] text-white shadow-[0_0_10px_rgba(10,132,255,0.5)]'
                : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]'
            }`}
            title="My Live GPS Location [L]"
          >
            <MyLocationRounded
              sx={{
                fontSize: 18,
                transition: 'transform 0.3s ease',
                transform: isLocating ? 'scale(1.15)' : 'scale(1)',
                animation: isLocating ? 'pulse 1s infinite' : 'none',
              }}
            />
          </button>

          {/* Smart Fit Route / Center Markers [Hotkey: F] */}
          <button
            type="button"
            onClick={handleSmartFit}
            className="p-2 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-all cursor-pointer"
            title="Fit Route Bounds & Markers [F]"
          >
            <CenterFocusStrongRounded sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Capsule 2: GIS Layers & RF Intelligence Controls */}
        <div className="flex flex-col items-center rounded-2xl border shadow-xl backdrop-blur-2xl bg-[var(--surface)]/95 border-[var(--border-subtle)] p-1 gap-1">
          {/* RF Infrastructure Overlays Menu */}
          <RfOverlaysMenu
            settings={rfSettings}
            onChange={setRfSettings}
            isOpen={showRfMenu}
            onToggleOpen={() => {
              setShowRfMenu(!showRfMenu)
              setShowBasemapMenu(false)
            }}
          />

          {/* Area Carrier Benchmark Matrix Trigger Button */}
          <button
            type="button"
            onClick={() => setShowCarrierMatrixModal(true)}
            className="p-2 rounded-xl text-[#FFD700] hover:bg-[#FFD700]/15 transition-all cursor-pointer"
            title="Carrier Benchmark Matrix"
          >
            <LeaderboardRounded sx={{ fontSize: 18 }} />
          </button>

          {/* Basemap Switcher Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBasemapMenu(!showBasemapMenu)
                setShowRfMenu(false)
              }}
              className="p-2 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-all cursor-pointer"
              title="Change Basemap Style"
            >
              <LayersRounded sx={{ fontSize: 18 }} />
            </button>

            {showBasemapMenu && (
              <div className="absolute right-12 bottom-0 w-44 rounded-2xl border shadow-2xl backdrop-blur-2xl p-1.5 flex flex-col gap-1 z-[1100] bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--on-surface)]">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 text-[var(--on-surface-dim)]">
                  Basemap Layer
                </span>
                {(['auto', 'dark', 'light', 'voyager', 'satellite', 'osm'] as const).map((bId) => {
                  const opt = basemapTiles[bId]
                  return (
                    <button
                      key={bId}
                      type="button"
                      onClick={() => {
                        setBasemapMode(bId)
                        setShowBasemapMenu(false)
                      }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans font-medium transition-colors text-left cursor-pointer ${
                        basemapMode === bId
                          ? 'bg-[var(--primary)] text-white font-bold'
                          : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {basemapMode === bId && <CheckRounded sx={{ fontSize: 14 }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="w-5 h-[1px] bg-[var(--border-subtle)] my-0.5" />

          {/* Toggle Stats HUD Button */}
          <button
            type="button"
            onClick={() => setShowStatsHud(!showStatsHud)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showStatsHud
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
            }`}
            title={showStatsHud ? 'Hide Telemetry HUD' : 'Show Telemetry HUD'}
          >
            <BarChartRounded sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>



      {/* ── Locating Error Banner ──────────────────────────────────────────── */}
      {locatingError && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1050] px-4 py-2 rounded-2xl border bg-[var(--surface)]/95 border-[var(--color-danger)] text-[var(--color-danger)] text-xs font-sans shadow-xl backdrop-blur-xl flex items-center gap-2">
          <span>{locatingError}</span>
        </div>
      )}

      {/* ── Public Heatmap Out-of-Viewport Guidance Chip ────────────────────── */}
      {mapMode === 'heatmap' && filteredHeatmapCells.length > 0 && mapInstance && (
        (() => {
          try {
            const b = mapInstance.getBounds()
            const hasCellsInView = filteredHeatmapCells.some((c) => b.contains([c.center[0], c.center[1]]))
            if (!hasCellsInView) {
              return (
                <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => handleSmartFit()}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl bg-[var(--surface)]/95 border border-[var(--primary)] text-[var(--primary)] shadow-lg hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer animate-in fade-in slide-in-from-top-2"
                  >
                    <WhatshotRounded sx={{ fontSize: 16 }} />
                    <span>Public coverage nearby · Click to fit to cells</span>
                  </button>
                </div>
              )
            }
          } catch {}
          return null
        })()
      )}

      {/* ── Bottom-Left Intelligence Deck (Stats, Leaderboard, Privacy) ────── */}
      <div className="absolute left-4 bottom-4 z-[1000] flex flex-col gap-2 w-[340px] sm:w-[360px] pointer-events-auto">
        {/* "Best in this Area" Floating Winner Bar (Public Heatmap Mode) */}
        {mapMode === 'heatmap' && carrierMatrix.length > 0 && (
          <div
            onClick={() => setShowCarrierMatrixModal(true)}
            className="p-3 rounded-2xl border shadow-xl backdrop-blur-2xl bg-[var(--surface)]/95 border-[var(--primary)]/40 hover:border-[var(--primary)] transition-all cursor-pointer flex items-center gap-3 animate-in fade-in duration-200"
            title="Click to view comprehensive Area Carrier Benchmark"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FFD700]/15 text-[#FFD700] shrink-0">
              <LeaderboardRounded sx={{ fontSize: 20 }} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--primary)]">
                  Top Carrier: {carrierMatrix[0].carrier}
                </span>
                <span className="text-[9px] text-[var(--on-surface-dim)] hidden sm:inline">
                  • Tap to compare
                </span>
              </div>
              <span className="text-xs font-sans text-[var(--on-surface)]">
                Avg DL: <strong>{carrierMatrix[0].avgDownloadMbps.toFixed(1)} Mbps</strong> • Ping:{' '}
                <strong>{carrierMatrix[0].avgLatencyMs.toFixed(0)} ms</strong> • Score:{' '}
                <strong>{carrierMatrix[0].generalScore} pts</strong>
              </span>
            </div>
          </div>
        )}

        {/* Real-Time Aggregate Stats HUD */}
        {showStatsHud && (
          <div className="flex flex-col gap-2 p-3 rounded-2xl border shadow-xl backdrop-blur-2xl bg-[var(--surface)]/95 border-[var(--border-subtle)] min-w-[220px] animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-1.5 border-[var(--border-subtle)]">
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--primary)] tracking-wider">
                {mapMode === 'personal' ? 'Local Archive Scope' : `${currentViewAreaName} Telemetry`}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                <button
                  type="button"
                  onClick={() => setStatsHudCollapsed(!statsHudCollapsed)}
                  className="text-[var(--on-surface-dim)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
                  title={statsHudCollapsed ? 'Expand Details' : 'Collapse Summary'}
                >
                  {statsHudCollapsed ? (
                    <KeyboardArrowUpRounded sx={{ fontSize: 16 }} />
                  ) : (
                    <KeyboardArrowDownRounded sx={{ fontSize: 16 }} />
                  )}
                </button>
              </div>
            </div>

            {/* Model Origin Indicator Pill (Heatmap Mode) */}
            {mapMode === 'heatmap' && !statsHudCollapsed && (
              <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--border-subtle)]/50">
                <span
                  className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                    isViewingBaselineSeed
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  {isViewingBaselineSeed ? 'REFERENCE BASELINE' : 'LIVE CROWD DATA'}
                </span>
                <span className="text-[10px] text-[var(--on-surface-dim)] font-mono">
                  {stats.count} visible cell{stats.count === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {statsHudCollapsed ? (
              <div
                onClick={() => setStatsHudCollapsed(false)}
                className="flex items-center justify-between text-xs font-mono font-semibold text-[var(--on-surface)] cursor-pointer py-0.5"
                title="Click to expand summary grid"
              >
                <span>Avg {stats.avgDown > 0 ? `${stats.avgDown.toFixed(1)}M` : '—'}</span>
                <span className="text-[10px] text-[var(--on-surface-dim)]">Ping {stats.avgPing.toFixed(0)}ms</span>
                <span className="text-[10px] text-[var(--primary)] font-bold">{stats.count} Nodes</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-sans text-[var(--on-surface-muted)]">Avg Down</span>
                  <span className="text-sm font-black font-mono text-[var(--on-surface)]">
                    {stats.avgDown > 0 ? `${stats.avgDown.toFixed(1)} Mbps` : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-sans text-[var(--on-surface-muted)]">Avg Latency</span>
                  <span className="text-sm font-black font-mono text-[var(--on-surface)]">
                    {stats.avgPing > 0 ? `${stats.avgPing.toFixed(1)} ms` : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-sans text-[var(--on-surface-muted)]">Peak Recorded</span>
                  <span className="text-sm font-black font-mono text-[var(--color-success)]">
                    {stats.topDown > 0 ? `${stats.topDown.toFixed(1)} Mbps` : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-sans text-[var(--on-surface-muted)]">
                    {mapMode === 'personal' ? 'Total Nodes' : 'Visible Nodes'}
                  </span>
                  <span className="text-sm font-black font-mono text-[var(--primary)]">
                    {stats.count}
                  </span>
                </div>
                {commuteSpanKm && (
                  <div className="col-span-2 pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10.5px]">
                    <span className="text-[var(--on-surface-muted)]">Commute Span:</span>
                    <strong className="font-mono text-cyan-400">~{commuteSpanKm} km corridor</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Spatial Privacy Safeguards & S2 Resolution Pill Badge */}
        <div className="px-3 py-2 rounded-2xl border backdrop-blur-xl flex items-center justify-between gap-2 text-xs bg-[var(--surface)]/95 border-[var(--border-subtle)] shadow-md">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldRounded sx={{ fontSize: 14, color: 'var(--primary)' }} className="shrink-0" />
            <span className="text-[10px] font-sans text-[var(--on-surface-muted)] truncate">
              {mapMode === 'personal'
                ? 'Client Sandbox • Private IndexedDB'
                : 'k-Anonymity (k≥5) • S2 L13'}
            </span>
          </div>
          <span className="text-[9.5px] font-mono font-bold text-[var(--on-surface)] shrink-0 px-2 py-0.5 rounded-md bg-[var(--surface-container-highest)] border border-[var(--border-subtle)] shadow-xs">
            {activeTileConfig.label}
          </span>
        </div>

        {/* Clear Test History Button */}
        {personalRecords.length > 0 && mapMode === 'personal' && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center justify-between p-2.5 rounded-2xl border backdrop-blur-xl text-xs bg-[var(--surface)]/95 border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all cursor-pointer shadow-md"
            title="Permanently remove all previous tests from local IndexedDB storage"
          >
            <div className="flex items-center gap-1.5 font-semibold text-[10.5px]">
              <DeleteOutlineRounded sx={{ fontSize: 14 }} />
              <span>Wipe Test History ({personalRecords.length})</span>
            </div>
          </button>
        )}
      </div>

      {/* ── Leaflet Interactive Surface ────────────────────────────────────── */}
      <div className="flex-1 w-full h-full min-h-0 relative">
        {/* Empty State Banner when 0 Real Personal Tests */}
        {mapMode === 'personal' && personalRecords.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] max-w-sm w-[90%] p-6 rounded-3xl border shadow-2xl backdrop-blur-2xl bg-[var(--surface)]/95 border-[var(--border-subtle)] text-center flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 pointer-events-auto">
            {unlocatedCount > 0 ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                  <PlaceRounded sx={{ fontSize: 28 }} />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-[var(--on-surface)]">
                    {unlocatedCount} Tests Found in History
                  </h3>
                  <p className="text-xs text-[var(--on-surface-muted)] leading-relaxed">
                    Your previous speed tests are stored without GPS coordinates. Map them to your location to view your real speeds and route on the map.
                  </p>
                </div>
                <div className="flex flex-col gap-2 mt-2 w-full">
                  <button
                    type="button"
                    disabled={isMappingUnlocated}
                    onClick={() => handleMapUnlocatedTests()}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-sans text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <MyLocationRounded sx={{ fontSize: 16 }} />
                    <span>{isMappingUnlocated ? 'Mapping Tests...' : `Map All ${unlocatedCount} Tests to Current Location`}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMappingUnlocated}
                    onClick={() => handleMapUnlocatedTests([6.9271, 79.8612])}
                    className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--on-surface)] font-sans text-xs font-medium transition-all flex items-center justify-center gap-1.5 bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    <PlaceRounded sx={{ fontSize: 15, color: 'var(--primary)' }} />
                    <span>Place at Colombo Hub</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                  <SensorsRounded sx={{ fontSize: 26 }} />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-[var(--on-surface)]">No Real Test Data Yet</h3>
                  <p className="text-xs text-[var(--on-surface-muted)] leading-relaxed">
                    All demo and sample points have been removed. Run a real speed test with location access enabled on the Home screen to map your real RF and throughput.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 w-full">
                  <Link
                    to="/"
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-sans text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <PlayArrowRounded sx={{ fontSize: 16 }} />
                    <span>Run Speed Test</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="py-2 px-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--on-surface)] font-sans text-xs font-medium transition-all flex items-center gap-1.5 bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    <MyLocationRounded sx={{ fontSize: 15, color: 'var(--primary)' }} />
                    <span>My Location</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <MapController
            targetCenter={flyTarget ? flyTarget.center : null}
            targetZoom={flyTarget ? flyTarget.zoom : undefined}
            onResetComplete={() => setFlyTarget(null)}
            onMapReady={setMapInstance}
            onZoomChange={setCurrentZoom}
            onMoveEnd={handleMapMoveEnd}
          />

          <TileLayer
            key={activeTileConfig.url}
            attribution={activeTileConfig.attribution}
            url={activeTileConfig.url}
            subdomains={activeTileConfig.subdomains || 'abc'}
            maxZoom={activeTileConfig.maxZoom || 19}
            maxNativeZoom={activeTileConfig.maxNativeZoom || 16}
          />

          {/* User Live Geolocation Beacon */}
          {userLocation && (
            <>
              {/* GPS Accuracy Uncertainty Radius */}
              <Circle
                center={userLocation.coords}
                radius={userLocation.accuracy}
                pathOptions={{
                  fillColor: '#0A84FF',
                  fillOpacity: 0.08,
                  color: '#0A84FF',
                  weight: 1.2,
                  dashArray: '5, 5',
                }}
              />
              {/* Premium Apple Maps Style Radar Beacon */}
              <Marker
                position={userLocation.coords}
                icon={divIcon({
                  className: 'nexis-user-location-marker',
                  html: `
                    <div class="nexis-user-beacon" title="Your GPS Location (±${Math.round(userLocation.accuracy)}m)">
                      <div class="nexis-user-pulse-inner"></div>
                      <div class="nexis-user-core-dot"></div>
                    </div>
                  `,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
              >
                <Popup>
                  <div className="p-3 flex flex-col gap-1.5 text-xs font-sans min-w-[190px]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--on-surface)] border-b pb-1.5 border-[var(--border-subtle)]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                      <span>Current Device GPS</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-muted)]">
                      <span>Confidence:</span>
                      <strong className="text-[var(--on-surface)]">±{Math.round(userLocation.accuracy)} meters</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-muted)]">
                      <span>Coordinates:</span>
                      <span className="font-mono text-[10.5px] text-[var(--primary)]">
                        {userLocation.coords[0].toFixed(5)}, {userLocation.coords[1].toFixed(5)}
                      </span>
                    </div>
                    {resolvedCarrier && (
                      <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-muted)] pt-1 border-t border-[var(--border-subtle)]">
                        <span>Active Network:</span>
                        <strong className="text-[var(--on-surface)]">{resolvedCarrier.isp}</strong>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* ── RF Tool 1: Route Trajectory Polyline & Speed Corridor Segments ─── */}
          {rfSettings.showRouteTrajectory &&
            mapMode === 'personal' &&
            sortedPersonalClusters.length >= 2 && (
              <>
                {/* 1A. Subtle Base Trajectory Line */}
                <Polyline
                  positions={sortedPersonalClusters.map((c) => c.center)}
                  pathOptions={{
                    color: '#0A84FF',
                    weight: 2,
                    opacity: 0.7,
                    dashArray: '5, 5',
                    lineJoin: 'round',
                  }}
                />

                {/* 1B. Speed Corridor Gradient Segments with Hover Telemetry (Feature B & C) */}
                {rfSettings.showSpeedCorridor &&
                  sortedPersonalClusters.slice(0, -1).map((c1, idx) => {
                    const c2 = sortedPersonalClusters[idx + 1]
                    const avgSegmentSpeed = (c1.avgDownload + c2.avgDownload) / 2
                    const segmentColor = getMetricColor(avgSegmentSpeed, 'Download')

                    return (
                      <Polyline
                        key={`corridor-${c1.id}-${c2.id}`}
                        positions={[c1.center, c2.center]}
                        pathOptions={{
                          color: segmentColor,
                          weight: 5,
                          opacity: 0.55,
                          lineCap: 'round',
                        }}
                      >
                        <Tooltip sticky direction="top" offset={[0, -10]}>
                          <div className="p-2 flex flex-col gap-1.5 text-xs font-sans min-w-[170px] bg-[var(--bg-surface)] backdrop-blur-md rounded-xl border border-[var(--border-subtle)] shadow-2xl text-[var(--on-surface)]">
                            <div className="flex items-center justify-between border-b pb-1.5 border-[var(--border-subtle)] font-bold">
                              <span className="text-[11px] font-mono tracking-tight text-[var(--on-surface-muted)]">Commute Corridor #{idx + 1}</span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold shadow-sm"
                                style={{ backgroundColor: `${segmentColor}25`, color: segmentColor, border: `1px solid ${segmentColor}40` }}
                              >
                                {avgSegmentSpeed.toFixed(1)} Mbps
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-dim)]">
                              <span>Throughput Span:</span>
                              <span className="text-[var(--on-surface)] font-mono font-semibold">
                                {c1.avgDownload.toFixed(1)} &rarr; {c2.avgDownload.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--on-surface-dim)] pt-0.5">
                              <span>Timestamp:</span>
                              <span className="font-mono text-[var(--on-surface-muted)]">{new Date(c2.latestRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </Tooltip>
                      </Polyline>
                    )
                  })}
              </>
            )}

          {/* ── RF Tool 2: Physical Cell Tower Base Stations Layer ─────────── */}
          {rfSettings.showCellTowers &&
            currentZoom >= 11 &&
            visibleTowers.map((tower) => {
              const is5G = tower.primaryRadio === '5G NR'
              const towerColor = is5G ? '#00E5FF' : '#F59E0B'
              const isDialog = tower.carrierName.toLowerCase().includes('dialog')
              const isMobitel = tower.carrierName.toLowerCase().includes('mobitel')
              const carrierBadgeColor = isDialog ? '#EF4444' : isMobitel ? '#10B981' : towerColor

              // Zoom-adaptive Level-of-Detail:
              // Zoom >= 16: Deep inspection with eNodeB identification pill
              // Zoom 14 - 15: Clean 18px mast glyph with subtle ground pin (no wide sector rings)
              // Zoom 12 - 13: Compact 12px circular carrier dot
              // Zoom < 12: Minimal 6px micro-dot
              const isMacroInspection = currentZoom >= 16
              const isDetailed = currentZoom >= 14
              const isMedium = currentZoom >= 12

              // Feature D: Antenna Azimuth Bearings (Defaults to 0°, 120°, 240° standard 3-sector mast)
              const azimuths = tower.azimuths || [0, 120, 240]

              const towerIcon = divIcon({
                className: 'nexis-cell-tower-icon',
                html: isMacroInspection
                  ? `
                  <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transform: translate(-50%, -100%);
                    cursor: pointer;
                  ">
                    <!-- Mast Identification Pill -->
                    <div style="
                      background: rgba(11, 15, 23, 0.94);
                      border: 1px solid ${carrierBadgeColor};
                      border-radius: 6px;
                      padding: 2px 5px;
                      color: #FFFFFF;
                      font-family: ui-monospace, SFMono-Regular, monospace;
                      font-size: 9.5px;
                      font-weight: 700;
                      white-space: nowrap;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      margin-bottom: 2px;
                    ">
                      <span style="width: 5px; height: 5px; border-radius: 9999px; background: ${carrierBadgeColor}; box-shadow: 0 0 6px ${carrierBadgeColor};"></span>
                      <span>${tower.cellIds[0] || 'BTS'}</span>
                    </div>

                    <!-- Tower Antenna Glyph -->
                    <div style="
                      width: 22px;
                      height: 22px;
                      border-radius: 9999px;
                      background: radial-gradient(circle, ${carrierBadgeColor} 0%, rgba(11, 15, 23, 0.95) 75%);
                      border: 2px solid #FFFFFF;
                      box-shadow: 0 0 10px ${carrierBadgeColor}, 0 2px 6px rgba(0,0,0,0.5);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #FFFFFF;
                    ">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                        <path d="M9 12H4s.55-3.03 2-4.5c1.26-1.26 3.5-1.5 3.5-1.5"/>
                      </svg>
                    </div>

                    <!-- Mast Pin Point -->
                    <div style="
                      width: 2px;
                      height: 5px;
                      background: ${carrierBadgeColor};
                    "></div>
                    <div style="
                      width: 4px;
                      height: 4px;
                      border-radius: 9999px;
                      background: #FFFFFF;
                      box-shadow: 0 0 6px ${carrierBadgeColor};
                    "></div>
                  </div>
                `
                  : isDetailed
                  ? `
                  <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transform: translate(-50%, -100%);
                    cursor: pointer;
                  ">
                    <!-- Compact Mast Glyph without label pill -->
                    <div style="
                      width: 18px;
                      height: 18px;
                      border-radius: 9999px;
                      background: radial-gradient(circle, ${carrierBadgeColor} 0%, rgba(11, 15, 23, 0.95) 75%);
                      border: 1.5px solid #FFFFFF;
                      box-shadow: 0 0 8px ${carrierBadgeColor}, 0 2px 5px rgba(0,0,0,0.5);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #FFFFFF;
                    ">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                      </svg>
                    </div>
                    <div style="width: 2px; height: 4px; background: ${carrierBadgeColor};"></div>
                    <div style="width: 3px; height: 3px; border-radius: 9999px; background: #FFFFFF;"></div>
                  </div>
                `
                  : isMedium
                  ? `
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 12px;
                    height: 12px;
                    border-radius: 9999px;
                    background: ${carrierBadgeColor};
                    border: 1.5px solid #FFFFFF;
                    box-shadow: 0 0 6px ${carrierBadgeColor};
                    transform: translate(-50%, -50%);
                    cursor: pointer;
                  ">
                    <span style="width: 3px; height: 3px; border-radius: 9999px; background: #FFFFFF;"></span>
                  </div>
                `
                  : `
                  <div style="
                    width: 5px;
                    height: 5px;
                    border-radius: 9999px;
                    background: ${carrierBadgeColor};
                    box-shadow: 0 0 4px ${carrierBadgeColor};
                    transform: translate(-50%, -50%);
                    cursor: pointer;
                  "></div>
                `,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              })

              // Smart Sector Visibility:
              // - Zoom >= 14: Show wedges for all visible towers when Sector Bearing Wedges is toggled ON.
              // - If user selects/clicks a specific tower, emphasize that tower's wedges.
              // - Below zoom 14: Only render wedges for the selected or serving BTS to prevent massive regional clutter.
              const isSelectedTower = selectedTowerId === tower.id
              const isServingTower = servingLink?.tower.id === tower.id
              const shouldRenderWedges =
                rfSettings.showSectorWedges &&
                (currentZoom >= 14 || isSelectedTower || isServingTower)

              return (
                <div key={tower.id}>
                  {/* Feature D: Directional Antenna Sector Wedges - Gated to prevent clutter */}
                  {shouldRenderWedges && (
                    <>
                      {azimuths.map((az) => (
                        <Polygon
                          key={`wedge-${tower.id}-${az}`}
                          positions={getSectorWedgeCoordinates(
                            tower.latitude,
                            tower.longitude,
                            tower.rangeMeters * 0.7,
                            az,
                            55
                          )}
                          pathOptions={{
                            fillColor: carrierBadgeColor,
                            fillOpacity: isSelectedTower || isServingTower ? 0.12 : 0.04,
                            color: carrierBadgeColor,
                            weight: isSelectedTower || isServingTower ? 1.8 : 1,
                            dashArray: isSelectedTower ? undefined : '3, 3',
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Sector coverage ring - Only rendered at high zoom (>= 15) when wedges are off, or for selected tower */}
                  {currentZoom >= 15 && !rfSettings.showSectorWedges && (isSelectedTower || isServingTower) && (
                    <Circle
                      center={[tower.latitude, tower.longitude]}
                      radius={tower.rangeMeters}
                      pathOptions={{
                        fillColor: carrierBadgeColor,
                        fillOpacity: 0.03,
                        color: carrierBadgeColor,
                        weight: 1,
                        dashArray: '4, 4',
                      }}
                    />
                  )}
                  <Marker
                    position={[tower.latitude, tower.longitude]}
                    icon={towerIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedTowerId((prev) => (prev === tower.id ? null : tower.id))
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-3 flex flex-col gap-1.5 text-xs font-sans min-w-[230px]">
                        <div className="flex items-center justify-between border-b pb-1.5 border-[var(--border-subtle)]">
                          <strong className="text-sm font-bold text-[var(--on-surface)]">
                            {tower.carrierName}
                          </strong>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                            style={{
                              backgroundColor: `${carrierBadgeColor}20`,
                              color: carrierBadgeColor,
                            }}
                          >
                            {tower.primaryRadio}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--on-surface-muted)] flex flex-col gap-1 mt-0.5">
                          <span className="font-semibold text-emerald-400 flex items-center gap-1">
                            ● CellMapper & OpenCelliD Verified Mast
                          </span>
                          {tower.mcc && tower.mnc && (
                            <span>
                              MCC/MNC: <strong className="font-mono text-[var(--on-surface)]">{tower.mcc}-{tower.mnc}</strong>
                            </span>
                          )}
                          {tower.tac && (
                            <span>
                              TAC / LAC: <strong className="font-mono text-[var(--on-surface)]">{tower.tac}</strong>
                            </span>
                          )}
                          <span>
                            Cell ID (eNodeB): <strong className="font-mono text-[var(--on-surface)]">{tower.cellIds.join(', ')}</strong>
                          </span>
                          <span>Coverage Radius: ~{tower.rangeMeters} meters</span>
                          <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
                            {tower.latitude.toFixed(5)}, {tower.longitude.toFixed(5)}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              )
            })}

          {/* ── RF Tool 3: Serving RF Laser Ray & Distance Marker ──────────── */}
          {servingLink && (
            <>
              {/* Outer Glow Polyline */}
              <Polyline
                positions={[servingLink.userPt, servingLink.towerPt]}
                pathOptions={{
                  color: '#FF9100',
                  weight: 7,
                  opacity: 0.3,
                }}
              />
              {/* Core Laser Beam */}
              <Polyline
                positions={[servingLink.userPt, servingLink.towerPt]}
                pathOptions={{
                  color: '#FFA726',
                  weight: 3,
                  opacity: 0.95,
                  dashArray: '5, 5',
                }}
              />
              {/* Midpoint Distance Badge */}
              <CircleMarker
                center={servingLink.midPt}
                radius={10}
                pathOptions={{
                  fillColor: '#FF9100',
                  fillOpacity: 1,
                  color: '#FFFFFF',
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  <div className="p-1 flex flex-col gap-0.5 text-xs font-sans">
                    <span className="font-bold text-[var(--on-surface)]">Nearest BTS Bearing (Geometric)</span>
                    <span className="text-[10px] text-[var(--on-surface-muted)]">
                      Distance: <strong>{servingLink.distText}</strong> to {servingLink.tower.carrierName} ({servingLink.tower.primaryRadio})
                    </span>
                    <span className="text-[9px] text-[var(--on-surface-dim)] font-mono">
                      Estimated line-of-sight vector • Proximity model
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>
            </>
          )}

          {/* ── Mode 1: Consolidated Personal Clusters & Location Nodes ─── */}
          {mapMode === 'personal' &&
            personalClusters.map((cluster) => {
              const isSelected =
                inspectedCluster?.id === cluster.id ||
                (inspectedPersonal && cluster.records.some((r) => r.id === inspectedPersonal.id))

              const metricVal =
                selectedMetric === 'Download'
                  ? cluster.avgDownload
                  : selectedMetric === 'Upload'
                  ? cluster.avgUpload
                  : selectedMetric === 'Latency'
                  ? cluster.avgLatency
                  : cluster.avgJitter

              const color = getMetricColor(metricVal, selectedMetric)
              const isDetailed = currentZoom >= 14
              const metricUnit =
                selectedMetric === 'Latency' || selectedMetric === 'Jitter' ? 'ms' : 'Mbps'
              const singleTech =
                cluster.records[0].tags?.[0] ||
                (cluster.records[0].downloadMbps && cluster.records[0].downloadMbps > 100
                  ? 'High Speed'
                  : 'Speed')
              const titleText =
                cluster.records.length > 1
                  ? `${cluster.records.length} Tests`
                  : singleTech

              const markerIcon = divIcon({
                className: 'nexis-node-marker-root',
                html: isDetailed
                  ? `
                    <div style="
                      position: relative;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      transform: translate(-50%, -100%);
                      cursor: pointer;
                      user-select: none;
                      filter: drop-shadow(0 6px 14px rgba(0,0,0,0.65));
                    ">
                      <!-- Elevated Obsidian Glass Capsule -->
                      <div style="
                        display: inline-flex;
                        align-items: center;
                        gap: 7px;
                        background: rgba(15, 23, 42, 0.96);
                        color: #ffffff;
                        padding: 5px 12px;
                        border-radius: 9999px;
                        backdrop-filter: blur(14px);
                        -webkit-backdrop-filter: blur(14px);
                        box-shadow: 0 0 12px ${color}40;
                        border: 1.5px solid ${isSelected ? '#00E5FF' : color};
                        white-space: nowrap;
                        font-family: system-ui, -apple-system, sans-serif;
                        font-size: 11.5px;
                        transition: transform 0.15s ease;
                      ">
                        <!-- Metric Indicator Core -->
                        <span style="
                          width: 8px;
                          height: 8px;
                          border-radius: 9999px;
                          background: ${color};
                          box-shadow: 0 0 8px ${color};
                          flex-shrink: 0;
                        "></span>
                        <span style="color: #F8FAFC; font-weight: 700; font-size: 11.5px; letter-spacing: -0.01em;">
                          ${titleText}
                        </span>
                        <span style="
                          color: #FFFFFF;
                          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                          font-weight: 700;
                          font-size: 11px;
                          border-left: 1px solid rgba(255,255,255,0.22);
                          padding-left: 7px;
                        ">
                          ${metricVal.toFixed(1)} <span style="color: #94A3B8; font-size: 9px; font-weight: 600;">${metricUnit}</span>
                        </span>
                      </div>

                      <!-- Downward Arrow / Pointer Stem -->
                      <div style="
                        width: 0;
                        height: 0;
                        border-left: 6px solid transparent;
                        border-right: 6px solid transparent;
                        border-top: 6px solid ${isSelected ? '#00E5FF' : color};
                        margin-top: -1px;
                      "></div>

                      <!-- Ground Target Dot (Exact GPS Coordinate on road) -->
                      <div style="
                        width: 6px;
                        height: 6px;
                        border-radius: 9999px;
                        background: ${color};
                        box-shadow: 0 0 8px ${color};
                        border: 1px solid #FFFFFF;
                        margin-top: 2px;
                      "></div>
                    </div>
                  `
                  : cluster.records.length > 1
                  ? `
                    <div style="
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 28px;
                      height: 28px;
                      border-radius: 9999px;
                      background: rgba(15, 23, 42, 0.95);
                      color: #FFFFFF;
                      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                      font-weight: 800;
                      font-size: 11px;
                      border: 2px solid ${isSelected ? '#00E5FF' : color};
                      box-shadow: 0 4px 14px rgba(0,0,0,0.65), 0 0 10px ${color}80;
                      transform: translate(-50%, -50%);
                      cursor: pointer;
                      user-select: none;
                      transition: transform 0.15s ease;
                    ">
                      ${cluster.records.length}
                    </div>
                  `
                  : `
                    <div style="
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 14px;
                      height: 14px;
                      border-radius: 9999px;
                      background: ${color};
                      border: 2px solid #FFFFFF;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.65), 0 0 8px ${color};
                      transform: translate(-50%, -50%);
                      cursor: pointer;
                    "></div>
                  `,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              })

              return (
                <div key={cluster.id}>
                  {/* Clean single location footprint aura */}
                  {rfSettings.showSignalAura && (
                    <Circle
                      center={cluster.center}
                      radius={isDetailed ? 35 : 45}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: isSelected ? 0.2 : 0.06,
                        color: color,
                        weight: isSelected ? 1.5 : 1,
                        dashArray: '3, 3',
                      }}
                    />
                  )}

                  <Marker
                    position={cluster.center}
                    icon={markerIcon}
                    zIndexOffset={600}
                    eventHandlers={{
                      click: () => {
                        setInspectedCluster(cluster)
                        setInspectedPersonal(cluster.latestRecord)
                        setInspectedCell(null)
                      },
                    }}
                  />
                </div>
              )
            })}

          {/* ── Mode 2: Public S2 Coverage Cells & Heatmap ─────────────────── */}
          {mapMode === 'heatmap' &&
            filteredHeatmapCells.map((cell) => {
              const isSelected = inspectedCell?.id === cell.id
              const color = getMetricColor(
                selectedMetric === 'Download'
                  ? cell.avgDownloadMbps
                  : selectedMetric === 'Upload'
                  ? cell.avgUploadMbps
                  : selectedMetric === 'Latency'
                  ? cell.avgLatencyMs
                  : cell.avgJitterMs,
                selectedMetric
              )

              const handleClick = () => {
                setInspectedCell(cell)
                setInspectedPersonal(null)
                setInspectedCluster(null)
              }

              // Compute zoom-adaptive radius to prevent oversized hex balloons at street level
              const adaptiveRadius = (() => {
                if (currentZoom >= 16) return Math.min(150, cell.radiusMeters * 0.35)
                if (currentZoom === 15) return Math.min(220, cell.radiusMeters * 0.48)
                if (currentZoom === 14) return Math.min(340, cell.radiusMeters * 0.70)
                if (currentZoom === 13) return Math.min(460, cell.radiusMeters * 0.88)
                return cell.radiusMeters
              })()

              const hexCoords =
                coverageMeshStyle === 'hex' || coverageMeshStyle === 'both'
                  ? getHexagonCoordinates(cell.center[0], cell.center[1], adaptiveRadius)
                  : []

              return (
                <div key={cell.id}>
                  {/* Hexagonal S2/H3 Honeycomb Cell Polygon */}
                  {(coverageMeshStyle === 'hex' || coverageMeshStyle === 'both') && (
                    <Polygon
                      positions={hexCoords}
                      eventHandlers={{ click: handleClick }}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: isSelected ? 0.52 : 0.30,
                        color: isSelected ? '#FFFFFF' : color,
                        weight: isSelected ? 2.5 : 1.2,
                        dashArray: cell.dominantTech === 'Wi-Fi' ? '4, 4' : undefined,
                      }}
                    />
                  )}

                  {/* Smooth Radial Coverage Aura */}
                  {(coverageMeshStyle === 'aura' || coverageMeshStyle === 'both') && (
                    <Circle
                      center={cell.center}
                      radius={adaptiveRadius}
                      eventHandlers={{ click: handleClick }}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: isSelected ? 0.45 : 0.25,
                        color: color,
                        weight: isSelected ? 3 : 1.5,
                        dashArray: cell.dominantTech === 'Wi-Fi' ? '4, 4' : undefined,
                      }}
                    />
                  )}

                  {/* Core hub pin */}
                  <CircleMarker
                    center={cell.center}
                    radius={isSelected ? 6 : 4}
                    eventHandlers={{ click: handleClick }}
                    pathOptions={{
                      fillColor: '#FFFFFF',
                      fillOpacity: 0.95,
                      color: color,
                      weight: 2,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                      <div className="flex flex-col gap-0.5 text-xs font-sans">
                        <span className="font-bold text-[var(--on-surface)]">
                          {cell.dominantCarrier} ({cell.dominantTech})
                        </span>
                        <span className="font-mono text-[11px] text-[var(--primary)] font-bold">
                          {selectedMetric}:{' '}
                          {selectedMetric === 'Download'
                            ? `${cell.avgDownloadMbps.toFixed(1)} Mbps`
                            : selectedMetric === 'Upload'
                            ? `${cell.avgUploadMbps.toFixed(1)} Mbps`
                            : `${cell.avgLatencyMs.toFixed(1)} ms`}
                        </span>
                        {cell.isBaselineSeed && (
                          <span className="text-[9px] font-mono text-amber-500 font-semibold">
                            • Baseline Reference Model
                          </span>
                        )}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                </div>
              )
            })}

          {/* ── Live Telemetry Animated Ripple Waves ─────────────────── */}
          {activePingWaves.map((wave) => (
            <div key={wave.id}>
              <Circle
                center={[wave.lat, wave.lng]}
                radius={850}
                pathOptions={{
                  color: wave.color,
                  fillColor: wave.color,
                  fillOpacity: 0.28,
                  weight: 2,
                  dashArray: '3, 6',
                }}
              />
              <CircleMarker
                center={[wave.lat, wave.lng]}
                radius={8}
                pathOptions={{
                  color: '#FFFFFF',
                  fillColor: wave.color,
                  fillOpacity: 1,
                  weight: 2.5,
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <span className="font-mono font-bold text-[11px] text-[var(--on-surface)]">
                    ⚡ {wave.speed.toFixed(1)} Mbps
                  </span>
                </Tooltip>
              </CircleMarker>
            </div>
          ))}
        </MapContainer>
      </div>

      {/* ── Slide-Over Inspector Drawer (Personal Record, Cluster or S2 Cell) ────────── */}
      {(inspectedPersonal || inspectedCluster || inspectedCell) && (
        <div className="absolute top-4 bottom-4 right-4 w-full max-w-[380px] sm:max-w-[400px] z-[1050] rounded-3xl border shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200 bg-[var(--surface)]/98 border-[var(--border-subtle)] pointer-events-auto">
          {/* Pinned Fixed Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--surface)]/90 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {inspectedCluster && inspectedCluster.records.length > 1 ? (
                  <PlaceRounded sx={{ fontSize: 20 }} />
                ) : inspectedPersonal ? (
                  <NavigationRounded sx={{ fontSize: 20 }} />
                ) : (
                  <CellTowerRounded sx={{ fontSize: 20 }} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold font-sans text-[var(--on-surface)] truncate">
                  {inspectedCluster && inspectedCluster.records.length > 1
                    ? `Test Node (${inspectedCluster.records.length} Tests)`
                    : inspectedPersonal
                    ? 'Personal Benchmark Node'
                    : 'S2 Grid Coverage Cell'}
                </span>
                <span className="text-[10px] font-mono font-medium text-[var(--on-surface-muted)] truncate">
                  {inspectedCluster && inspectedCluster.records.length > 1
                    ? `${inspectedCluster.center[0].toFixed(5)}, ${inspectedCluster.center[1].toFixed(5)}`
                    : inspectedPersonal
                    ? new Date(inspectedPersonal.timestamp).toLocaleString()
                    : `Token: 0x${inspectedCell?.cellToken} (${inspectedCell?.city})`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setInspectedPersonal(null)
                setInspectedCluster(null)
                setInspectedCell(null)
              }}
              className="p-1.5 rounded-xl text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
              title="Close Panel"
            >
              <CloseRounded sx={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-4 flex-1 overflow-y-auto scroll-smooth flex flex-col gap-3 min-h-0">
            {/* Primary Throughput Gauges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col p-3 rounded-2xl border bg-[var(--bg-subtle)]/70 border-[var(--border-subtle)] border-l-4 border-l-[#0798D4] shadow-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-bold font-sans text-[var(--on-surface-muted)]">
                  <ArrowDownwardRounded sx={{ fontSize: 15, color: '#0798D4' }} />
                  <span>DOWNLOAD</span>
                </div>
                <span className="text-xl font-black font-mono text-[var(--on-surface)] mt-1 tracking-tight">
                  {inspectedCluster && inspectedCluster.records.length > 1
                    ? formatMbps(inspectedCluster.avgDownload)
                    : inspectedPersonal
                    ? formatMbps(inspectedPersonal.downloadMbps)
                    : `${inspectedCell?.avgDownloadMbps.toFixed(1)} Mbps`}
                </span>
                {inspectedCluster && inspectedCluster.records.length > 1 && (
                  <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-[var(--color-success)] bg-[var(--color-success)]/10 px-1.5 py-0.5 rounded-md mt-1.5 w-fit">
                    <span>Peak:</span>
                    <span>{formatMbps(inspectedCluster.peakDownload)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col p-3 rounded-2xl border bg-[var(--bg-subtle)]/70 border-[var(--border-subtle)] border-l-4 border-l-[#10B981] shadow-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-bold font-sans text-[var(--on-surface-muted)]">
                  <ArrowUpwardRounded sx={{ fontSize: 15, color: '#10B981' }} />
                  <span>UPLOAD</span>
                </div>
                <span className="text-xl font-black font-mono text-[var(--on-surface)] mt-1 tracking-tight">
                  {inspectedCluster && inspectedCluster.records.length > 1
                    ? formatMbps(inspectedCluster.avgUpload)
                    : inspectedPersonal
                    ? formatMbps(inspectedPersonal.uploadMbps)
                    : `${inspectedCell?.avgUploadMbps.toFixed(1)} Mbps`}
                </span>
              </div>
            </div>

            {/* Secondary Latency & Diagnostic Grid */}
            <div className="flex flex-col gap-2 rounded-2xl p-3 border bg-[var(--bg-subtle)]/40 border-[var(--border-subtle)] text-xs font-sans">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--on-surface-muted)] font-medium">RTT Roundtrip:</span>
                <span className="font-mono font-bold text-[var(--on-surface)]">
                  {inspectedCluster && inspectedCluster.records.length > 1
                    ? formatMs(inspectedCluster.avgLatency)
                    : inspectedPersonal
                    ? formatMs(inspectedPersonal.latencyMs)
                    : `${inspectedCell?.avgLatencyMs.toFixed(1)} ms`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--on-surface-muted)] font-medium">RFC 3550 Jitter:</span>
                <span className="font-mono font-bold text-[var(--on-surface)]">
                  {inspectedCluster && inspectedCluster.records.length > 1
                    ? formatMs(inspectedCluster.avgJitter)
                    : inspectedPersonal
                    ? formatMs(inspectedPersonal.jitterMs)
                    : `${inspectedCell?.avgJitterMs.toFixed(1)} ms`}
                </span>
              </div>
              {(() => {
                const displayLoss =
                  inspectedCluster && inspectedCluster.records.length > 1
                    ? inspectedCluster.avgLossPercent
                    : inspectedPersonal?.lossPercent

                if (displayLoss === undefined || displayLoss === null) return null

                return (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--on-surface-muted)] font-medium">
                      {inspectedCluster && inspectedCluster.records.length > 1 ? 'Avg Packet Loss:' : 'Packet Loss:'}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        displayLoss > 5
                          ? 'text-[var(--color-danger)]'
                          : displayLoss > 0
                          ? 'text-[var(--color-warning)]'
                          : 'text-[var(--color-success)]'
                      }`}
                    >
                      {displayLoss.toFixed(1)}%
                    </span>
                  </div>
                )
              })()}
              {/* Carrier / ISP Row */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--on-surface-muted)] font-medium">Carrier / ISP:</span>
                <span className="font-mono font-semibold text-[var(--primary)] truncate max-w-[200px] text-right">
                  {inspectedCell
                    ? inspectedCell.dominantCarrier
                    : (() => {
                        const ispName =
                          inspectedPersonal?.isp ||
                          inspectedCluster?.latestRecord.isp ||
                          resolvedCarrier?.isp ||
                          'SLT-Mobitel'
                        const asnNum =
                          inspectedPersonal?.asn ||
                          inspectedCluster?.latestRecord.asn ||
                          resolvedCarrier?.asn
                        return `${ispName}${asnNum ? ` (AS${asnNum})` : ''}`
                      })()}
                </span>
              </div>

              {/* Edge Node / Gateway */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--on-surface-muted)] font-medium">Edge Datacenter:</span>
                <span className="font-mono font-semibold text-[var(--on-surface)] truncate max-w-[190px] text-right">
                  {inspectedPersonal?.colo ||
                    inspectedCluster?.latestRecord.colo ||
                    'CMB (Colombo Datacenter)'}
                </span>
              </div>

              {/* Cluster Volume (if multi-test node) */}
              {inspectedCluster && inspectedCluster.records.length > 1 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--on-surface-muted)] font-medium">Total Tests:</span>
                  <span className="font-mono font-bold text-[var(--on-surface)]">
                    {inspectedCluster.records.length} measurements
                  </span>
                </div>
              )}

              {/* S2 Crowdsource Quality & Confidence Diagnostics */}
              {inspectedCell && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--on-surface-muted)] font-medium">Data Origin:</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inspectedCell.isLiveCrowdsourced
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : inspectedCell.isBaselineSeed
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      }`}
                    >
                      {inspectedCell.isLiveCrowdsourced
                        ? 'Live Cloud Aggregated'
                        : inspectedCell.isBaselineSeed
                        ? 'Synthetic Reference Baseline'
                        : 'Bundled Telemetry'}
                    </span>
                  </div>

                  {inspectedCell.isBaselineSeed && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[10.5px] text-amber-600 dark:text-amber-400 leading-relaxed">
                      <strong>Empirical Reference Baseline:</strong> This cell provides expected regional averages based on carrier spectrum allocation. Run a speed test in this area to contribute genuine verified telemetry.
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--on-surface-muted)] font-medium">Sample Density:</span>
                    <span className="font-mono font-bold text-[var(--on-surface)]">
                      {inspectedCell.sampleCount} samples {inspectedCell.distinctDevices ? `(${inspectedCell.distinctDevices} devices)` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--on-surface-muted)] font-medium">Confidence Score:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-[var(--surface-container-high)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${inspectedCell.confidence ?? Math.min(100, inspectedCell.sampleCount * 8)}%`,
                            backgroundColor:
                              (inspectedCell.confidence ?? 50) >= 70
                                ? 'var(--color-success)'
                                : (inspectedCell.confidence ?? 50) >= 40
                                ? 'var(--color-warning)'
                                : 'var(--color-danger)',
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[10px] text-[var(--on-surface)]">
                        {inspectedCell.confidence ?? Math.min(100, inspectedCell.sampleCount * 8)}%
                      </span>
                    </div>
                  </div>

                  {inspectedCell.lastSeen && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--on-surface-muted)] font-medium">Last Sampled:</span>
                      <span className="font-mono text-[10px] text-[var(--on-surface-dim)]">
                        {new Date(inspectedCell.lastSeen).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* Gamification / Coverage Bounty Callout */}
                  {inspectedCell.sampleCount < 3 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px]">
                      <span className="text-base">🚀</span>
                      <div>
                        <span className="font-bold">Coverage Pioneer Zone:</span>
                        <p className="text-[10px] text-amber-200/80 leading-tight mt-0.5">
                          Only {inspectedCell.sampleCount} test{inspectedCell.sampleCount === 1 ? '' : 's'} recorded here. Run a speed test in this zone to earn contributor XP!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Technology & Diagnostics Badges */}
              {(() => {
                const rawTags =
                  inspectedPersonal?.tags ||
                  inspectedCluster?.latestRecord.tags ||
                  []
                const cleanedTags = rawTags
                  .map((t) =>
                    t.toLowerCase() === '3g'
                      ? resolvedCarrier?.connectionType || 'Fiber'
                      : t
                  )
                  .filter(Boolean)
                const displayTags =
                  cleanedTags.length > 0
                    ? cleanedTags
                    : [resolvedCarrier?.connectionType || 'Fiber']

                return (
                  <div className="flex flex-col gap-1 pt-1.5 border-t border-[var(--border-subtle)] text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-sans text-[var(--on-surface-muted)]">Tech:</span>
                      <div className="flex flex-wrap gap-1">
                        {displayTags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] text-[10px] font-mono font-bold uppercase tracking-wider"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    {inspectedPersonal?.notes && (
                      <span className="text-[var(--on-surface-muted)] italic text-[11px] bg-[var(--surface)]/60 px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                        "{inspectedPersonal.notes}"
                      </span>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* QoE Application Suitability Assessment */}
            {(() => {
              const down = inspectedCluster ? inspectedCluster.avgDownload : (inspectedPersonal?.downloadMbps || 0)
              const up = inspectedCluster ? inspectedCluster.avgUpload : (inspectedPersonal?.uploadMbps || 0)
              const ping = inspectedCluster ? inspectedCluster.avgLatency : (inspectedPersonal?.latencyMs || 0)
              const jitter = inspectedCluster ? inspectedCluster.avgJitter : (inspectedPersonal?.jitterMs || 0)
              const qoe = computeQoE(down, up, ping, jitter)

              return (
                <div className="flex flex-col gap-2 rounded-2xl p-3 border bg-[var(--bg-subtle)]/40 border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between border-b pb-1.5 border-[var(--border-subtle)]">
                    <span className="text-[10px] font-mono uppercase font-bold text-[var(--on-surface-muted)] tracking-wider">
                      Application Suitability (QoE)
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                      style={{ backgroundColor: `${qoe.gaming.color}20`, color: qoe.gaming.color }}
                    >
                      Grade {qoe.stabilityGrade}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <div className="flex flex-col items-center justify-between p-2 rounded-xl border bg-[var(--surface)]/90 border-[var(--border-subtle)] text-center min-h-[68px] transition-all hover:border-[var(--border-strong)]">
                      <SportsEsportsRounded sx={{ fontSize: 17, color: qoe.gaming.color }} />
                      <span className="text-[10.5px] font-bold mt-1 leading-tight" style={{ color: qoe.gaming.color }}>
                        {qoe.gaming.grade}
                      </span>
                      <span className="text-[9px] font-medium text-[var(--on-surface-muted)] mt-0.5">Gaming</span>
                    </div>

                    <div className="flex flex-col items-center justify-between p-2 rounded-xl border bg-[var(--surface)]/90 border-[var(--border-subtle)] text-center min-h-[68px] transition-all hover:border-[var(--border-strong)]">
                      <TvRounded sx={{ fontSize: 17, color: qoe.streaming.color }} />
                      <span className="text-[10.5px] font-bold mt-1 leading-tight" style={{ color: qoe.streaming.color }}>
                        {qoe.streaming.grade}
                      </span>
                      <span className="text-[9px] font-medium text-[var(--on-surface-muted)] mt-0.5">4K Stream</span>
                    </div>

                    <div className="flex flex-col items-center justify-between p-2 rounded-xl border bg-[var(--surface)]/90 border-[var(--border-subtle)] text-center min-h-[68px] transition-all hover:border-[var(--border-strong)]">
                      <VideoCameraFrontRounded sx={{ fontSize: 17, color: qoe.videoCall.color }} />
                      <span className="text-[10.5px] font-bold mt-1 leading-tight" style={{ color: qoe.videoCall.color }}>
                        {qoe.videoCall.grade}
                      </span>
                      <span className="text-[9px] font-medium text-[var(--on-surface-muted)] mt-0.5">Video Call</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Historical Speed Trend Sparkline */}
            {inspectedCluster && inspectedCluster.records.length >= 2 && (
              <div className="p-3 rounded-2xl border bg-[var(--bg-subtle)]/40 border-[var(--border-subtle)]">
                <NodeSparkline
                  values={inspectedCluster.records.map((r) => r.downloadMbps || 0).reverse()}
                  color="#00E5FF"
                  label="Chronological Speed Trend"
                  width={320}
                  height={50}
                />
              </div>
            )}

            {/* Scrollable list of tests at this cluster location */}
            {inspectedCluster && inspectedCluster.records.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--on-surface-muted)] tracking-wider">
                  Tests at this Location ({inspectedCluster.records.length})
                </span>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {inspectedCluster.records.map((r) => {
                    const isCur = inspectedPersonal?.id === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setInspectedPersonal(r)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-sans text-left transition-colors cursor-pointer border ${
                          isCur
                            ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--on-surface)]'
                            : 'bg-[var(--bg-subtle)] border-transparent hover:bg-[var(--surface-hover)] text-[var(--on-surface-muted)]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--on-surface)]">
                            {formatMbps(r.downloadMbps)}
                          </span>
                          <span className="text-[10px] text-[var(--on-surface-dim)]">
                            {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Ping {formatMs(r.latencyMs)}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--on-surface-dim)]">
                          {new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Spatial Coordinates & Privacy Box */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border bg-[var(--bg-canvas)]/40 border-[var(--border-subtle)] text-[11px] font-mono">
              <span className="text-[var(--on-surface-dim)]">
                {inspectedCluster
                  ? `${inspectedCluster.center[0].toFixed(5)}, ${inspectedCluster.center[1].toFixed(5)}`
                  : inspectedPersonal?.location
                  ? `${inspectedPersonal.location.lat.toFixed(5)}, ${inspectedPersonal.location.lng.toFixed(5)}`
                  : inspectedCell
                  ? `${inspectedCell.center[0].toFixed(5)}, ${inspectedCell.center[1].toFixed(5)}`
                  : '—'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (inspectedCluster) {
                    handleCopy(inspectedCluster.center[0], inspectedCluster.center[1])
                  } else if (inspectedPersonal?.location) {
                    handleCopy(inspectedPersonal.location.lat, inspectedPersonal.location.lng)
                  } else if (inspectedCell) {
                    handleCopy(inspectedCell.center[0], inspectedCell.center[1])
                  }
                }}
                className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline cursor-pointer"
              >
                {copiedCoords ? (
                  <>
                    <CheckRounded sx={{ fontSize: 13 }} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <ContentCopyRounded sx={{ fontSize: 13 }} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pinned Fixed Action Footer */}
          <div className="p-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 backdrop-blur-md shrink-0">
            {inspectedCluster && inspectedCluster.records.length > 1 ? (
              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={() => exportToCsv(inspectedCluster.records)}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-sans font-bold bg-[var(--surface-container-high)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--on-surface)] transition-all cursor-pointer shadow-xs"
                >
                  <FileDownloadRounded sx={{ fontSize: 16, color: 'var(--primary)' }} />
                  <span>Export {inspectedCluster.records.length} Tests (CSV)</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/history/${inspectedCluster.latestRecord.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-sans font-bold bg-[var(--primary)] text-white shadow-xs hover:bg-[var(--primary-hover)] transition-all text-center"
                  >
                    <LaunchRounded sx={{ fontSize: 14 }} />
                    <span>Latest Test</span>
                  </Link>
                  <Link
                    to="/history"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-sans font-semibold border border-[var(--border-subtle)] text-[var(--on-surface)] hover:bg-[var(--bg-subtle)] transition-all text-center"
                  >
                    <span>All History</span>
                  </Link>
                </div>
              </div>
            ) : inspectedPersonal ? (
              <div className="flex flex-col gap-2 w-full">
                <Link
                  to={`/history/${inspectedPersonal.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
                >
                  <LaunchRounded sx={{ fontSize: 15 }} />
                  <span>Open Telemetry Archive</span>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMeasurement(inspectedPersonal.id)
                    setPersonalRecords((prev) => prev.filter((r) => r.id !== inspectedPersonal.id))
                    setInspectedPersonal(null)
                    setInspectedCluster(null)
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-sans font-semibold border border-[var(--border-subtle)] hover:border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all cursor-pointer"
                >
                  <DeleteOutlineRounded sx={{ fontSize: 15 }} />
                  <span>Delete This Test</span>
                </button>
              </div>
            ) : inspectedCell ? (
              <button
                type="button"
                onClick={() => {
                  setFlyTarget({ center: inspectedCell.center, zoom: 14 })
                }}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
              >
                <CenterFocusStrongRounded sx={{ fontSize: 15 }} />
                <span>Center on S2 Cell</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Elevation & Topography Graph Drawer ────────────────────────────── */}
      <ElevationProfileDrawer
        isOpen={rfSettings.showElevationProfile}
        onClose={() => setRfSettings({ ...rfSettings, showElevationProfile: false })}
        records={filteredPersonalRecords}
      />

      {/* ── Area Carrier Benchmark Matrix Modal ────────────────────────────── */}
      <CarrierMatrixModal
        isOpen={showCarrierMatrixModal}
        onClose={() => setShowCarrierMatrixModal(false)}
        carrierMatrix={carrierMatrix}
        mapMode={mapMode}
        onSelectCarrier={(carrier) => {
          setSelectedCarrier(carrier)
          setShowCarrierMatrixModal(false)
        }}
      />

      {/* ── Live Telemetry Feed Drawer ──────────────────────────────── */}
      <LiveTelemetryDrawer
        isOpen={showLiveDrawer}
        onClose={() => setShowLiveDrawer(false)}
        events={liveEvents}
        isStreaming={isLiveStreaming}
        onToggleStreaming={() => setIsLiveStreaming(!isLiveStreaming)}
        isSimulationActive={isSimulationActive}
        onToggleSimulation={() => setIsSimulationActive(!isSimulationActive)}
        onClearEvents={() => setLiveEvents([])}
        onLocateEvent={(evt) => {
          setFlyTarget({ center: [evt.latitude, evt.longitude], zoom: 14 })
          setActivePingWaves((prev) => [
            ...prev,
            {
              id: `wave-locate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              lat: evt.latitude,
              lng: evt.longitude,
              color:
                evt.networkType === '5G'
                  ? '#10B981'
                  : evt.networkType === 'WIFI'
                  ? '#3B82F6'
                  : '#F59E0B',
              speed: evt.downloadMbps,
            },
          ])
        }}
        isSupabaseConnected={isSupabaseConnected}
      />

      {/* ── Clear Old Data Confirmation Modal ────────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-[var(--color-danger)]">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-danger)]/15 flex items-center justify-center shrink-0">
                <DeleteOutlineRounded sx={{ fontSize: 22 }} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-[var(--on-surface)]">Clear Test History?</h3>
                <span className="text-[11px] text-[var(--on-surface-muted)]">IndexedDB Local Database</span>
              </div>
            </div>
            <p className="text-xs text-[var(--on-surface-muted)] leading-relaxed">
              This will permanently delete all {personalRecords.length} stored speed tests from your local browser storage. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-sans font-medium text-[var(--on-surface-muted)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90 transition-colors shadow-sm cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

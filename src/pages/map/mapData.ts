import type { MeasurementRecord } from '@/data/models'

export interface CellTowerSite {
  id: string
  latitude: number
  longitude: number
  carrierName: string
  radios: string[]
  cellIds: number[]
  rangeMeters: number
  primaryRadio: '5G NR' | '4G LTE' | '3G UMTS'
  mcc?: number
  mnc?: number
  lac?: number
  tac?: number
  isReal?: boolean
  azimuths?: number[]
}

/** Computes arc coordinates for an RF sector beam wedge (e.g. 60-degree beam) */
export function getSectorWedgeCoordinates(
  lat: number,
  lng: number,
  radiusMeters: number,
  bearingDeg: number,
  beamWidthDeg = 65,
  steps = 10
): [number, number][] {
  const points: [number, number][] = [[lat, lng]]
  const startAngle = bearingDeg - beamWidthDeg / 2
  const endAngle = bearingDeg + beamWidthDeg / 2

  // Earth radius in meters
  const R = 6378137

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (i / steps) * (endAngle - startAngle)
    const rad = (angle * Math.PI) / 180
    const dLat = (radiusMeters * Math.cos(rad)) / R
    const dLng = (radiusMeters * Math.sin(rad)) / (R * Math.cos((lat * Math.PI) / 180))
    points.push([lat + (dLat * 180) / Math.PI, lng + (dLng * 180) / Math.PI])
  }
  points.push([lat, lng])
  return points
}

/**
 * Computes geodesic polygon coordinates for an H3-style regular hexagon.
 * Creates an authentic honeycomb grid layout for crowdsourced RF telemetry.
 */
export function getHexagonCoordinates(
  lat: number,
  lng: number,
  radiusMeters: number
): [number, number][] {
  const points: [number, number][] = []
  const R = 6378137 // Earth radius in meters
  // 6 vertices at 60 degree increments (rotated 30 deg for flat-top hexagon)
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i + 30
    const rad = (angleDeg * Math.PI) / 180
    const dLat = (radiusMeters * Math.cos(rad)) / R
    const dLng = (radiusMeters * Math.sin(rad)) / (R * Math.cos((lat * Math.PI) / 180))
    points.push([lat + (dLat * 180) / Math.PI, lng + (dLng * 180) / Math.PI])
  }
  return points
}

export interface S2CoverageCell {
  id: string
  cellToken: string
  center: [number, number]
  radiusMeters: number
  avgDownloadMbps: number
  avgUploadMbps: number
  avgLatencyMs: number
  avgJitterMs: number
  sampleCount: number
  distinctDevices?: number
  confidence?: number // 0 - 100 percentage
  dominantTech: '5G' | 'Wi-Fi' | 'Fiber' | '4G LTE'
  dominantCarrier: string
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  city: string
  lastSeen?: string
  isLiveCrowdsourced?: boolean
  isBaselineSeed?: boolean
}

/** Computes crowdsourced coverage confidence rating from sample density & distinct contributors */
export function computeConfidenceScore(sampleCount: number, distinctDevices = 1): number {
  return Math.min(100, Math.round(sampleCount * 8 + distinctDevices * 15))
}

export interface CityHub {
  name: string
  center: [number, number]
  zoom: number
  country: string
}

export const GLOBAL_HUBS: CityHub[] = [
  { name: 'Colombo', center: [6.9271, 79.8612], zoom: 13, country: 'Sri Lanka' },
  { name: 'Singapore', center: [1.3521, 103.8198], zoom: 12, country: 'Singapore' },
  { name: 'Tokyo', center: [35.6762, 139.6503], zoom: 12, country: 'Japan' },
  { name: 'London', center: [51.5074, -0.1278], zoom: 12, country: 'United Kingdom' },
  { name: 'Frankfurt', center: [50.1109, 8.6821], zoom: 12, country: 'Germany' },
  { name: 'New York', center: [40.7128, -74.006], zoom: 12, country: 'United States' },
  { name: 'San Francisco', center: [37.7749, -122.4194], zoom: 12, country: 'United States' },
  { name: 'Sydney', center: [-33.8688, 151.2093], zoom: 12, country: 'Australia' },
]

export const SAMPLE_PERSONAL_RECORDS: MeasurementRecord[] = [
  {
    id: 'sample-bench-colombo-1',
    timestamp: Date.now() - 1000 * 60 * 35,
    downloadMbps: 218.4,
    uploadMbps: 84.2,
    latencyMs: 14.8,
    jitterMs: 1.9,
    lossPercent: 0,
    endpointUrl: 'https://cmb.speed.nexis.net',
    methodVersion: 'nexis-web-v1',
    colo: 'CMB - Colombo Datacenter',
    location: {
      lat: 6.9271,
      lng: 79.8612,
      accuracyM: 18,
      precision: 'precise',
    },
  },
  {
    id: 'sample-bench-colombo-2',
    timestamp: Date.now() - 1000 * 60 * 180,
    downloadMbps: 94.6,
    uploadMbps: 38.1,
    latencyMs: 28.4,
    jitterMs: 4.2,
    lossPercent: 0.1,
    endpointUrl: 'https://cmb.speed.nexis.net',
    methodVersion: 'nexis-web-v1',
    colo: 'CMB - Colombo Datacenter',
    location: {
      lat: 6.9344,
      lng: 79.8428,
      accuracyM: 25,
      precision: 'approximate',
    },
  },
  {
    id: 'sample-bench-colombo-3',
    timestamp: Date.now() - 1000 * 3600 * 12,
    downloadMbps: 452.1,
    uploadMbps: 185.0,
    latencyMs: 9.2,
    jitterMs: 0.8,
    lossPercent: 0,
    endpointUrl: 'https://cmb.speed.nexis.net',
    methodVersion: 'nexis-web-v1',
    colo: 'CMB - Colombo Central Fiber',
    location: {
      lat: 6.9147,
      lng: 79.8732,
      accuracyM: 12,
      precision: 'precise',
    },
  },
  {
    id: 'sample-bench-colombo-4',
    timestamp: Date.now() - 1000 * 3600 * 24,
    downloadMbps: 32.5,
    uploadMbps: 11.2,
    latencyMs: 56.1,
    jitterMs: 8.5,
    lossPercent: 0.8,
    endpointUrl: 'https://cmb.speed.nexis.net',
    methodVersion: 'nexis-web-v1',
    colo: 'CMB - Cellular Sub-node',
    location: {
      lat: 6.8965,
      lng: 79.8587,
      accuracyM: 45,
      precision: 'approximate',
    },
  },
  {
    id: 'sample-bench-colombo-5',
    timestamp: Date.now() - 1000 * 3600 * 48,
    downloadMbps: 168.9,
    uploadMbps: 62.4,
    latencyMs: 22.0,
    jitterMs: 2.4,
    lossPercent: 0,
    endpointUrl: 'https://cmb.speed.nexis.net',
    methodVersion: 'nexis-web-v1',
    colo: 'CMB - Colombo Datacenter',
    location: {
      lat: 6.9412,
      lng: 79.8685,
      accuracyM: 20,
      precision: 'precise',
    },
  },
]

export const PUBLIC_HEATMAP_CELLS: S2CoverageCell[] = [
  // ── Sri Lanka: Gampaha District (Kotugoda, Ekala, Ja-Ela, Katunayake, Negombo) ───
  {
    id: 'cell-ktg-1',
    cellToken: '89c2598k1',
    center: [7.0945, 79.9420], // Kotugoda Junction / B400 & B111
    radiusMeters: 450,
    avgDownloadMbps: 32.5,
    avgUploadMbps: 11.4,
    avgLatencyMs: 33.2,
    avgJitterMs: 3.4,
    sampleCount: 42,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Kotugoda',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ktg-2',
    cellToken: '89c2598k2',
    center: [7.0980, 79.9490], // Kotugoda Road / Nedungamuwa FTTH
    radiusMeters: 450,
    avgDownloadMbps: 98.4,
    avgUploadMbps: 45.2,
    avgLatencyMs: 9.8,
    avgJitterMs: 1.1,
    sampleCount: 38,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre (FTTH)',
    quality: 'Excellent',
    city: 'Kotugoda',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ktg-3',
    cellToken: '89c2598k3',
    center: [7.0890, 79.9380], // Kotugoda South / Galloluwa
    radiusMeters: 480,
    avgDownloadMbps: 22.8,
    avgUploadMbps: 8.2,
    avgLatencyMs: 38.5,
    avgJitterMs: 4.2,
    sampleCount: 29,
    dominantTech: '4G LTE',
    dominantCarrier: 'SLT-Mobitel 4G LTE',
    quality: 'Good',
    city: 'Kotugoda',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ekl-1',
    cellToken: '89c2598e1',
    center: [7.0982, 79.9125], // Ekala Industrial Zone (Kurunduwatta)
    radiusMeters: 500,
    avgDownloadMbps: 38.2,
    avgUploadMbps: 14.0,
    avgLatencyMs: 29.8,
    avgJitterMs: 3.1,
    sampleCount: 58,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Ekala',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ekl-2',
    cellToken: '89c2598e2',
    center: [7.0860, 79.9210], // Ekala Junction (B111 / Ja-Ela Rd)
    radiusMeters: 480,
    avgDownloadMbps: 17.5,
    avgUploadMbps: 6.0,
    avgLatencyMs: 43.5,
    avgJitterMs: 5.4,
    sampleCount: 24,
    dominantTech: '4G LTE',
    dominantCarrier: 'Hutch 4G LTE',
    quality: 'Fair',
    city: 'Ekala',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ekl-3',
    cellToken: '89c2598e3',
    center: [7.0930, 79.9300], // Ekala East / B400 Corridor
    radiusMeters: 450,
    avgDownloadMbps: 95.0,
    avgUploadMbps: 42.0,
    avgLatencyMs: 10.2,
    avgJitterMs: 1.2,
    sampleCount: 35,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre (FTTH)',
    quality: 'Excellent',
    city: 'Ekala',
    isBaselineSeed: true,
  },
  {
    id: 'cell-jae-1',
    cellToken: '89c2598j1',
    center: [7.0750, 79.8920], // Ja-Ela Central Town & Flyover
    radiusMeters: 500,
    avgDownloadMbps: 42.8,
    avgUploadMbps: 16.5,
    avgLatencyMs: 27.5,
    avgJitterMs: 2.8,
    sampleCount: 82,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Ja-Ela',
    isBaselineSeed: true,
  },
  {
    id: 'cell-jae-2',
    cellToken: '89c2598j2',
    center: [7.0850, 79.9050], // Ja-Ela E03 Expressway Interchange
    radiusMeters: 520,
    avgDownloadMbps: 34.5,
    avgUploadMbps: 12.8,
    avgLatencyMs: 31.5,
    avgJitterMs: 3.2,
    sampleCount: 49,
    dominantTech: '4G LTE',
    dominantCarrier: 'SLT-Mobitel 4G LTE-A',
    quality: 'Good',
    city: 'Ja-Ela',
    isBaselineSeed: true,
  },
  {
    id: 'cell-jae-3',
    cellToken: '89c2598j3',
    center: [7.0780, 79.8890], // Ja-Ela Reality Plaza & Station
    radiusMeters: 420,
    avgDownloadMbps: 26.5,
    avgUploadMbps: 15.0,
    avgLatencyMs: 24.0,
    avgJitterMs: 4.0,
    sampleCount: 31,
    dominantTech: 'Wi-Fi',
    dominantCarrier: 'Commercial Wi-Fi',
    quality: 'Good',
    city: 'Ja-Ela',
    isBaselineSeed: true,
  },
  {
    id: 'cell-sdu-1',
    cellToken: '89c2598s1',
    center: [7.1230, 79.8820], // Seeduwa Town / Negombo Road
    radiusMeters: 500,
    avgDownloadMbps: 21.0,
    avgUploadMbps: 7.8,
    avgLatencyMs: 38.0,
    avgJitterMs: 4.5,
    sampleCount: 34,
    dominantTech: '4G LTE',
    dominantCarrier: 'Airtel 4G LTE',
    quality: 'Good',
    city: 'Seeduwa',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ktn-1',
    cellToken: '89c2598t1',
    center: [7.1800, 79.8840], // Bandaranaike Intl Airport (BIA Katunayake)
    radiusMeters: 550,
    avgDownloadMbps: 185.0,
    avgUploadMbps: 48.0,
    avgLatencyMs: 16.5,
    avgJitterMs: 1.8,
    sampleCount: 120,
    dominantTech: '5G',
    dominantCarrier: 'Dialog 5G Pre-Commercial Trial',
    quality: 'Excellent',
    city: 'Katunayake',
    isBaselineSeed: true,
  },
  {
    id: 'cell-ktn-2',
    cellToken: '89c2598t2',
    center: [7.1650, 79.8910], // Katunayake FTZ / Free Trade Zone
    radiusMeters: 500,
    avgDownloadMbps: 192.0,
    avgUploadMbps: 90.0,
    avgLatencyMs: 8.5,
    avgJitterMs: 0.9,
    sampleCount: 65,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 200M',
    quality: 'Excellent',
    city: 'Katunayake',
    isBaselineSeed: true,
  },
  {
    id: 'cell-neg-1',
    cellToken: '89c2598n1',
    center: [7.2080, 79.8350], // Negombo Town & Main Street
    radiusMeters: 500,
    avgDownloadMbps: 38.5,
    avgUploadMbps: 14.2,
    avgLatencyMs: 30.5,
    avgJitterMs: 3.1,
    sampleCount: 76,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Negombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-neg-2',
    cellToken: '89c2598n2',
    center: [7.2280, 79.8410], // Negombo Beach Road & Tourism Strip
    radiusMeters: 500,
    avgDownloadMbps: 96.0,
    avgUploadMbps: 44.0,
    avgLatencyMs: 10.5,
    avgJitterMs: 1.2,
    sampleCount: 54,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 100M',
    quality: 'Excellent',
    city: 'Negombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-gmp-1',
    cellToken: '89c2598g1',
    center: [7.0910, 80.0150], // Gampaha Town & Railway Terminal
    radiusMeters: 500,
    avgDownloadMbps: 36.0,
    avgUploadMbps: 13.5,
    avgLatencyMs: 32.0,
    avgJitterMs: 3.4,
    sampleCount: 68,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Gampaha',
    isBaselineSeed: true,
  },
  {
    id: 'cell-gmp-2',
    cellToken: '89c2598g2',
    center: [7.0850, 79.9980], // Miriswatta Kandy Road Hub
    radiusMeters: 500,
    avgDownloadMbps: 28.5,
    avgUploadMbps: 10.2,
    avgLatencyMs: 35.0,
    avgJitterMs: 3.8,
    sampleCount: 31,
    dominantTech: '4G LTE',
    dominantCarrier: 'SLT-Mobitel 4G LTE-A',
    quality: 'Good',
    city: 'Gampaha',
    isBaselineSeed: true,
  },
  {
    id: 'cell-gnm-1',
    cellToken: '89c2598g3',
    center: [7.0650, 79.9600], // Ganemulla Railway & Commercial
    radiusMeters: 450,
    avgDownloadMbps: 94.0,
    avgUploadMbps: 40.0,
    avgLatencyMs: 11.0,
    avgJitterMs: 1.3,
    sampleCount: 29,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 100M',
    quality: 'Good',
    city: 'Ganemulla',
    isBaselineSeed: true,
  },
  {
    id: 'cell-rgm-1',
    cellToken: '89c2598r1',
    center: [7.0250, 79.9200], // Ragama Teaching Hospital & Medical Faculty
    radiusMeters: 500,
    avgDownloadMbps: 190.0,
    avgUploadMbps: 88.0,
    avgLatencyMs: 8.2,
    avgJitterMs: 0.8,
    sampleCount: 89,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 200M',
    quality: 'Excellent',
    city: 'Ragama',
    isBaselineSeed: true,
  },
  {
    id: 'cell-rgm-2',
    cellToken: '89c2598r2',
    center: [7.0300, 79.9230], // Ragama Railway Junction
    radiusMeters: 480,
    avgDownloadMbps: 34.0,
    avgUploadMbps: 12.5,
    avgLatencyMs: 33.0,
    avgJitterMs: 3.5,
    sampleCount: 45,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Ragama',
    isBaselineSeed: true,
  },
  {
    id: 'cell-kdw-1',
    cellToken: '89c2598d1',
    center: [7.0010, 79.9530], // Kadawatha Central Interchange (OCH / E02 / E04)
    radiusMeters: 520,
    avgDownloadMbps: 44.5,
    avgUploadMbps: 16.0,
    avgLatencyMs: 28.5,
    avgJitterMs: 2.9,
    sampleCount: 91,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Kadawatha',
    isBaselineSeed: true,
  },
  {
    id: 'cell-wtl-1',
    cellToken: '89c2598w1',
    center: [6.9850, 79.8900], // Wattala Hendala Junction
    radiusMeters: 500,
    avgDownloadMbps: 39.0,
    avgUploadMbps: 15.0,
    avgLatencyMs: 30.0,
    avgJitterMs: 3.0,
    sampleCount: 67,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Wattala',
    isBaselineSeed: true,
  },
  {
    id: 'cell-kln-1',
    cellToken: '89c2598l1',
    center: [6.9730, 79.9150], // Kelaniya University & Temple Area
    radiusMeters: 500,
    avgDownloadMbps: 95.5,
    avgUploadMbps: 44.0,
    avgLatencyMs: 9.8,
    avgJitterMs: 1.0,
    sampleCount: 72,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 100M',
    quality: 'Excellent',
    city: 'Kelaniya',
    isBaselineSeed: true,
  },

  // ── Sri Lanka: Greater Colombo & Western Province Hubs ─────────────────────
  {
    id: 'cell-cmb-1',
    cellToken: '89c2598a1',
    center: [6.9271, 79.8612], // Colombo Fort / Commercial Hub
    radiusMeters: 500,
    avgDownloadMbps: 215.0,
    avgUploadMbps: 54.0,
    avgLatencyMs: 15.2,
    avgJitterMs: 1.5,
    sampleCount: 140,
    dominantTech: '5G',
    dominantCarrier: 'Dialog 5G Pre-Commercial Trial',
    quality: 'Excellent',
    city: 'Colombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-cmb-2',
    cellToken: '89c2598a2',
    center: [6.9385, 79.8519], // Colombo Kollupitiya / Marine Drive
    radiusMeters: 480,
    avgDownloadMbps: 195.0,
    avgUploadMbps: 92.0,
    avgLatencyMs: 7.9,
    avgJitterMs: 0.7,
    sampleCount: 120,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 200M',
    quality: 'Excellent',
    city: 'Colombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-cmb-3',
    cellToken: '89c2598a3',
    center: [6.9080, 79.8680], // Colombo 7 (Cinnamon Gardens)
    radiusMeters: 500,
    avgDownloadMbps: 85.0,
    avgUploadMbps: 40.0,
    avgLatencyMs: 18.5,
    avgJitterMs: 2.2,
    sampleCount: 89,
    dominantTech: 'Wi-Fi',
    dominantCarrier: 'Corporate Wi-Fi 6',
    quality: 'Good',
    city: 'Colombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-cmb-4',
    cellToken: '89c2598a4',
    center: [6.8920, 79.8540], // Colombo Bambalapitiya
    radiusMeters: 500,
    avgDownloadMbps: 22.0,
    avgUploadMbps: 8.5,
    avgLatencyMs: 39.5,
    avgJitterMs: 4.8,
    sampleCount: 46,
    dominantTech: '4G LTE',
    dominantCarrier: 'Hutch 4G LTE',
    quality: 'Fair',
    city: 'Colombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-cmb-5',
    cellToken: '89c2598a5',
    center: [6.9450, 79.8750], // Colombo Maradana
    radiusMeters: 500,
    avgDownloadMbps: 24.5,
    avgUploadMbps: 9.0,
    avgLatencyMs: 37.0,
    avgJitterMs: 4.2,
    sampleCount: 50,
    dominantTech: '4G LTE',
    dominantCarrier: 'Airtel 4G LTE',
    quality: 'Good',
    city: 'Colombo',
    isBaselineSeed: true,
  },
  {
    id: 'cell-cmb-6',
    cellToken: '89c2598a6',
    center: [6.8980, 79.9190], // Battaramulla / Parliament Hub
    radiusMeters: 500,
    avgDownloadMbps: 98.0,
    avgUploadMbps: 46.0,
    avgLatencyMs: 9.5,
    avgJitterMs: 1.0,
    sampleCount: 62,
    dominantTech: 'Fiber',
    dominantCarrier: 'SLT-Mobitel Fibre 100M',
    quality: 'Excellent',
    city: 'Battaramulla',
    isBaselineSeed: true,
  },
  {
    id: 'cell-cmb-7',
    cellToken: '89c2598a7',
    center: [6.8650, 79.8970], // Nugegoda High-Level Road
    radiusMeters: 500,
    avgDownloadMbps: 38.0,
    avgUploadMbps: 14.5,
    avgLatencyMs: 31.0,
    avgJitterMs: 3.2,
    sampleCount: 51,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Nugegoda',
    isBaselineSeed: true,
  },
  {
    id: 'cell-kdy-1',
    cellToken: '89c2598kdy',
    center: [7.2906, 80.6337], // Kandy City Centre
    radiusMeters: 500,
    avgDownloadMbps: 34.0,
    avgUploadMbps: 12.0,
    avgLatencyMs: 34.0,
    avgJitterMs: 3.5,
    sampleCount: 42,
    dominantTech: '4G LTE',
    dominantCarrier: 'Dialog Axiata 4G LTE-A',
    quality: 'Good',
    city: 'Kandy',
    isBaselineSeed: true,
  },
  {
    id: 'cell-gle-1',
    cellToken: '89c2598gle',
    center: [6.0328, 80.2170], // Galle Fort
    radiusMeters: 500,
    avgDownloadMbps: 26.5,
    avgUploadMbps: 9.5,
    avgLatencyMs: 36.5,
    avgJitterMs: 3.8,
    sampleCount: 31,
    dominantTech: '4G LTE',
    dominantCarrier: 'SLT-Mobitel 4G LTE-A',
    quality: 'Good',
    city: 'Galle',
    isBaselineSeed: true,
  },
]

export type BasemapMode = 'auto' | 'dark' | 'light' | 'voyager' | 'satellite' | 'osm'

export interface BasemapOption {
  id: BasemapMode
  label: string
  url: string
  attribution: string
  subdomains?: string
  maxZoom?: number
  maxNativeZoom?: number
}

export function getBasemapTiles(theme: 'dark' | 'light'): Record<BasemapMode, BasemapOption> {
  const autoUrl =
    theme === 'dark'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

  return {
    auto: {
      id: 'auto',
      label: 'Theme Auto',
      url: autoUrl,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16,
    },
    dark: {
      id: 'dark',
      label: 'Dark Canvas',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16,
    },
    light: {
      id: 'light',
      label: 'Light Canvas',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16,
    },
    voyager: {
      id: 'voyager',
      label: 'World Topo',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA',
      maxZoom: 19,
      maxNativeZoom: 18,
    },
    satellite: {
      id: 'satellite',
      label: 'Esri Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
      maxNativeZoom: 18,
    },
    osm: {
      id: 'osm',
      label: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      maxNativeZoom: 19,
    },
  }
}

/** Color calculation for Download metric */
export function getMetricColor(
  val: number | null,
  metric: 'Download' | 'Upload' | 'Latency' | 'Jitter'
): string {
  if (val === null || val === undefined) return '#94A3B8'

  if (metric === 'Download' || metric === 'Upload') {
    // Throughput scale
    if (val >= 200) return '#10B981' // Neon emerald
    if (val >= 75) return '#06B6D4'  // Cyan
    if (val >= 25) return '#F59E0B'  // Amber
    return '#EF4444'                 // Red/Warning
  }

  if (metric === 'Latency') {
    // Latency scale (lower is better)
    if (val < 20) return '#10B981'   // Ultra fast
    if (val < 45) return '#06B6D4'   // Great
    if (val < 90) return '#F59E0B'   // Acceptable
    return '#EF4444'                 // High latency
  }

  if (metric === 'Jitter') {
    if (val < 2) return '#10B981'
    if (val < 5) return '#06B6D4'
    if (val < 15) return '#F59E0B'
    return '#EF4444'
  }

  return '#0798D4'
}

export const SAMPLE_CELL_TOWERS: CellTowerSite[] = [
  // Colombo Towers
  {
    id: 'tower-cmb-01',
    latitude: 6.9312,
    longitude: 79.8550,
    carrierName: 'Dialog Axiata',
    radios: ['5G NR', '4G LTE', '3G UMTS'],
    cellIds: [41301, 41302, 41303],
    rangeMeters: 1200,
    primaryRadio: '5G NR',
  },
  {
    id: 'tower-cmb-02',
    latitude: 6.9215,
    longitude: 79.8665,
    carrierName: 'SLT-Mobitel',
    radios: ['5G NR', '4G LTE'],
    cellIds: [20411, 20412, 20413],
    rangeMeters: 950,
    primaryRadio: '5G NR',
  },
  {
    id: 'tower-cmb-03',
    latitude: 6.9102,
    longitude: 79.8590,
    carrierName: 'Airtel Lanka',
    radios: ['4G LTE', '5G NR'],
    cellIds: [50121, 50122],
    rangeMeters: 800,
    primaryRadio: '4G LTE',
  },
  {
    id: 'tower-cmb-04',
    latitude: 6.9405,
    longitude: 79.8690,
    carrierName: 'Hutch Telecom',
    radios: ['4G LTE'],
    cellIds: [60841, 60842],
    rangeMeters: 1100,
    primaryRadio: '4G LTE',
  },
  {
    id: 'tower-cmb-05',
    latitude: 6.8995,
    longitude: 79.8620,
    carrierName: 'Dialog Axiata',
    radios: ['5G NR', '4G LTE'],
    cellIds: [41581, 41582],
    rangeMeters: 1400,
    primaryRadio: '5G NR',
  },

  // Singapore Towers
  {
    id: 'tower-sin-01',
    latitude: 1.2855,
    longitude: 103.8565,
    carrierName: 'Singtel',
    radios: ['5G NR', '4G LTE'],
    cellIds: [10291, 10292],
    rangeMeters: 750,
    primaryRadio: '5G NR',
  },
  {
    id: 'tower-sin-02',
    latitude: 1.3010,
    longitude: 103.8390,
    carrierName: 'StarHub',
    radios: ['5G NR', '4G LTE'],
    cellIds: [20811, 20812],
    rangeMeters: 850,
    primaryRadio: '5G NR',
  },

  // London Towers
  {
    id: 'tower-lon-01',
    latitude: 51.5120,
    longitude: -0.0980,
    carrierName: 'EE Telecom',
    radios: ['5G NR', '4G LTE'],
    cellIds: [30111, 30112],
    rangeMeters: 900,
    primaryRadio: '5G NR',
  },

  // New York Towers
  {
    id: 'tower-nyc-01',
    latitude: 40.7550,
    longitude: -73.9820,
    carrierName: 'Verizon mmWave',
    radios: ['5G NR', '4G LTE'],
    cellIds: [88011, 88012],
    rangeMeters: 600,
    primaryRadio: '5G NR',
  },
]

/** Computes distance between two coordinates in meters using the Haversine formula */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/** Finds the closest physical cell tower for a given position */
export function findNearestTower(
  lat: number,
  lng: number,
  towers = SAMPLE_CELL_TOWERS
): { tower: CellTowerSite; distanceMeters: number } | null {
  if (towers.length === 0) return null

  let nearest: CellTowerSite = towers[0]
  let minDistance = haversineDistanceMeters(lat, lng, towers[0].latitude, towers[0].longitude)

  for (let i = 1; i < towers.length; i++) {
    const dist = haversineDistanceMeters(lat, lng, towers[i].latitude, towers[i].longitude)
    if (dist < minDistance) {
      minDistance = dist
      nearest = towers[i]
    }
  }

  return { tower: nearest, distanceMeters: Math.round(minDistance) }
}

export interface PersonalCluster {
  id: string
  center: [number, number]
  records: MeasurementRecord[]
  avgDownload: number
  avgUpload: number
  avgLatency: number
  avgJitter: number
  avgLossPercent?: number
  peakDownload: number
  latestRecord: MeasurementRecord
}

/** Groups nearby personal benchmark records within cluster radius (default 150m) into single location nodes */
export function clusterPersonalRecords(
  records: MeasurementRecord[],
  maxDistanceMeters = 150
): PersonalCluster[] {
  const clusters: PersonalCluster[] = []
  const sorted = [...records]
    .filter(
      (r) =>
        r.location &&
        typeof r.location.lat === 'number' &&
        !isNaN(r.location.lat) &&
        typeof r.location.lng === 'number' &&
        !isNaN(r.location.lng)
    )
    .sort((a, b) => b.timestamp - a.timestamp)

  for (const rec of sorted) {
    const lat = rec.location!.lat
    const lng = rec.location!.lng

    let matchedCluster: PersonalCluster | null = null
    for (const cluster of clusters) {
      const dist = haversineDistanceMeters(lat, lng, cluster.center[0], cluster.center[1])
      if (dist <= maxDistanceMeters) {
        matchedCluster = cluster
        break
      }
    }

    if (matchedCluster) {
      matchedCluster.records.push(rec)
    } else {
      clusters.push({
        id: `cluster-${rec.id}`,
        center: [lat, lng],
        records: [rec],
        avgDownload: rec.downloadMbps || 0,
        avgUpload: rec.uploadMbps || 0,
        avgLatency: rec.latencyMs || 0,
        avgJitter: rec.jitterMs || 0,
        peakDownload: rec.downloadMbps || 0,
        latestRecord: rec,
      })
    }
  }

  for (const c of clusters) {
    const n = c.records.length
    const sumDown = c.records.reduce((acc, r) => acc + (r.downloadMbps || 0), 0)
    const sumUp = c.records.reduce((acc, r) => acc + (r.uploadMbps || 0), 0)
    const sumLat = c.records.reduce((acc, r) => acc + (r.latencyMs || 0), 0)
    const sumJit = c.records.reduce((acc, r) => acc + (r.jitterMs || 0), 0)

    c.avgDownload = sumDown / n
    c.avgUpload = sumUp / n
    c.avgLatency = sumLat / n
    c.avgJitter = sumJit / n
    c.peakDownload = Math.max(...c.records.map((r) => r.downloadMbps || 0))

    const validLossRecords = c.records.filter(
      (r) => r.lossPercent !== null && r.lossPercent !== undefined && !isNaN(r.lossPercent)
    )
    c.avgLossPercent =
      validLossRecords.length > 0
        ? validLossRecords.reduce((acc, r) => acc + (r.lossPercent || 0), 0) / validLossRecords.length
        : undefined

    // Centroid of all tests at this location
    const validRecords = c.records.filter(
      (r) =>
        r.location &&
        typeof r.location.lat === 'number' &&
        !isNaN(r.location.lat) &&
        typeof r.location.lng === 'number' &&
        !isNaN(r.location.lng)
    )
    if (validRecords.length > 0) {
      const sumLatCoord = validRecords.reduce((acc, r) => acc + r.location!.lat, 0)
      const sumLngCoord = validRecords.reduce((acc, r) => acc + r.location!.lng, 0)
      c.center = [sumLatCoord / validRecords.length, sumLngCoord / validRecords.length]
    }
  }

  return clusters.filter(
    (c) =>
      c.center &&
      typeof c.center[0] === 'number' &&
      !isNaN(c.center[0]) &&
      typeof c.center[1] === 'number' &&
      !isNaN(c.center[1])
  )
}


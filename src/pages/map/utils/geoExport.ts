import type { MeasurementRecord } from '@/data/models'
import type { CellTowerSite, S2CoverageCell } from '../mapData'

export function exportToGeoJson(
  records: MeasurementRecord[],
  towers: CellTowerSite[] = [],
  cells: S2CoverageCell[] = []
): void {
  const features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Point'
      coordinates: [number, number]
    }
    properties: Record<string, unknown>
  }> = []

  // Add personal benchmarks
  records.forEach((r) => {
    if (!r.location) return
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [r.location.lng, r.location.lat],
      },
      properties: {
        id: r.id,
        category: 'Personal Benchmark',
        timestamp: new Date(r.timestamp).toISOString(),
        downloadMbps: r.downloadMbps,
        uploadMbps: r.uploadMbps,
        latencyMs: r.latencyMs,
        jitterMs: r.jitterMs,
        endpoint: r.colo || r.endpointUrl,
        accuracyM: r.location.accuracyM,
      },
    })
  })

  // Add physical cell towers
  towers.forEach((t) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [t.longitude, t.latitude],
      },
      properties: {
        id: t.id,
        category: 'Cell Tower',
        carrier: t.carrierName,
        radios: t.radios.join(', '),
        cellIds: t.cellIds.join(', '),
        rangeMeters: t.rangeMeters,
      },
    })
  })

  // Add S2 cell centers
  cells.forEach((c) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [c.center[1], c.center[0]],
      },
      properties: {
        id: c.id,
        category: 'S2 Coverage Cell',
        cellToken: c.cellToken,
        carrier: c.dominantCarrier,
        tech: c.dominantTech,
        avgDownloadMbps: c.avgDownloadMbps,
        avgLatencyMs: c.avgLatencyMs,
        sampleCount: c.sampleCount,
      },
    })
  })

  const geoJson = {
    type: 'FeatureCollection',
    name: 'NEXIS_GIS_Telemetry_Export',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  }

  const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/geo+json' })
  downloadFile(blob, `nexis-gis-telemetry-${Date.now()}.geojson`)
}

export function exportToCsv(records: MeasurementRecord[]): void {
  const header = [
    'ID',
    'Timestamp',
    'Latitude',
    'Longitude',
    'AccuracyM',
    'Download_Mbps',
    'Upload_Mbps',
    'Latency_ms',
    'Jitter_ms',
    'Endpoint_Colo',
  ]

  const rows = records
    .filter((r) => r.location)
    .map((r) => [
      r.id,
      new Date(r.timestamp).toISOString(),
      r.location!.lat.toFixed(6),
      r.location!.lng.toFixed(6),
      r.location!.accuracyM.toFixed(1),
      r.downloadMbps ?? '',
      r.uploadMbps ?? '',
      r.latencyMs ?? '',
      r.jitterMs ?? '',
      `"${r.colo || 'Cloudflare'}"`,
    ])

  const csvContent = [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadFile(blob, `nexis-measurements-${Date.now()}.csv`)
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

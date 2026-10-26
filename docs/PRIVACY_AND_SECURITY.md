# NEXIS Differential Privacy & Security Architecture

This document outlines the cryptographic and mathematical privacy protections implemented across the **NEXIS** telemetry and crowdsourcing pipelines.

---

## 1. Threat Model & Design Goals

When benchmarking broadband and cellular radio connections, three primary privacy risks exist:

1. **Subscriber Location Triangulation:** High-precision GPS coordinates could reveal a user's exact residential dwelling or workplace.
2. **Subscriber Identity Correlation:** Static device identifiers, MAC addresses, or public IP addresses could link diagnostic tests to an individual person.
3. **Targeted Subnet Interrogation:** Public disclosure of private ISP connection details could expose vulnerable consumer CPE routers.

### NEXIS Privacy Guarantees
* **Guarantee 1:** No personal identifying information (PII) is ever collected or solicited.
* **Guarantee 2:** Client IP addresses are zeroed to `/24` (IPv4) or `/64` (IPv6) subnet prefixes before remote persistence.
* **Guarantee 3:** Geolocation coordinates are mathematically quantized to Google S2 Level 13 polygons (~1.2 km precision).
* **Guarantee 4:** Crowdsourced cellular coverage grids enforce strict $k$-anonymity ($k \ge 2$) before displaying any cell on the public map.

---

## 2. Google S2 Spatial Geometry Quantization

Instead of storing raw latitude and longitude coordinates ($\text{e.g. } 6.9271^\circ\text{ N}, 79.8612^\circ\text{ E}$), NEXIS projects geographic coordinates onto the **Google S2 spherical Hilbert curve**:

```
Continuous Earth Coordinates (Lat, Lng)
                   │
                   ▼
  Spherical Cube Projection (Face 0..5)
                   │
                   ▼
  1D Hilbert Space-Filling Curve Mapping
                   │
                   ▼
S2 Cell ID Level 13 (Hex: 0x3ae259...)
[Average Diameter: ~1.2 km / Area: ~1.4 km²]
```

### Mathematical Properties of S2 Level 13
* **Spatial Resolution:** Cell edges vary between 0.8 km and 1.5 km depending on latitude.
* **Triangulation Prevention:** A 1.2 km polygonal radius encompasses thousands of households and offices in metropolitan environments, eliminating the ability to pinpoint an individual subscriber's residence.
* **Efficient Spatial Indexing:** S2 cell IDs are compact 64-bit integers, enabling sub-millisecond B-tree lookups in PostgreSQL.

---

## 3. Subnet Host Zeroing (IP Anonymization)

Before any measurement payload is saved or submitted to the crowdsourced backend, the client-side masking function strips individual host identifiers:

### IPv4 Masking (`/24` CIDR)
```
Original IP:    198.51.100.47
Subnet Mask:    255.255.255.0  (/24)
Masked Result:  198.51.100.0   (Host octet zeroed)
```

### IPv6 Masking (`/64` CIDR)
```
Original IP:    2001:0db8:85a3:0000:0000:8a2e:0370:7334
Prefix Mask:    ffff:ffff:ffff:ffff:0000:0000:0000:0000 (/64)
Masked Result:  2001:0db8:85a3:0000:: (Interface identifier stripped)
```

This retains Autonomous System Number (ASN) and carrier routing context while preventing subscriber re-identification.

---

## 4. Ephemeral Probe Pseudonyms

NEXIS generates a cryptographically random, ephemeral probe identifier upon initialization:

```typescript
function getOrGenerateProbeId(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `probe-anon-${hex}`
}
```

* **Storage:** Held exclusively in browser `localStorage`.
* **Zero Association:** Disconnected from hardware MAC addresses, browser canvas fingerprints, or user accounts.
* **User Control:** Can be rotated or destroyed on demand via the *Rotate Ephemeral ID* button in Settings.

---

## 5. Home Privacy Geofencing

Users can configure a personal exclusion boundary in Settings:

```typescript
export interface HomePrivacyGeofence {
  lat: number
  lng: number
  radiusM: number
  enabled: boolean
}
```

Whenever an active speedtest completes:
1. The client computes the Haversine distance between current device GPS and the geofence center.
2. If `distance <= radiusM`, the upload to the crowdsourced database is **automatically aborted locally**.
3. The measurement is stored exclusively in the user's local IndexedDB with an indicator that crowdsourcing was suppressed.

---

## 6. Database $k$-Anonymity Guardrails

The public PostgreSQL + PostGIS database enforces $k$-anonymity via a dedicated materialized view:

```sql
CREATE MATERIALIZED VIEW public.mv_coverage_grid AS
SELECT
    s2_cell_id,
    carrier_name,
    network_type,
    COUNT(id) AS sample_count,
    COUNT(DISTINCT device_id) AS distinct_devices,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY download_mbps) AS median_download_mbps,
    AVG(latency_ms) AS avg_latency_ms,
    ST_Centroid(ST_Collect(geom)) AS geom_centroid
FROM public.telemetry_records
WHERE status = 'VERIFIED'
GROUP BY s2_cell_id, carrier_name, network_type
HAVING COUNT(DISTINCT device_id) >= 2; -- Strict k-anonymity guardrail
```

Even if a malicious actor accesses the public coverage endpoint, no individual device's signal or speed can be isolated without at least two independent corroborating probes.

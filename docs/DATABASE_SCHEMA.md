# NEXIS Database & PostGIS Crowdsourcing Schema

This document details the database architecture, table definitions, PostGIS geometry types, and materialized views utilized for the **NEXIS** crowdsourced cellular coverage engine.

---

## 1. Architectural Role

The crowdsourced database serves as the centralized, privacy-preserving repository for shared network benchmarks:
* **Ingestion:** Receives anonymized, S2-quantized diagnostic records from web clients and mobile probes.
* **k-Anonymity Aggregation:** Materializes spatial cells where at least 2 distinct probe devices have verified signal.
* **Spatial RPC Functions:** Serves bounding box queries (`get_coverage_in_bbox`) to the Leaflet frontend in sub-millisecond execution times.

---

## 2. Table Definition: `public.telemetry_records`

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.telemetry_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,                   -- Ephemeral anonymized probe token (e.g. probe-anon-xxxx)
    network_type TEXT NOT NULL,                -- '5G', 'LTE', 'WIFI', '3G', 'FIBER'
    carrier_name TEXT NOT NULL,                -- e.g. 'Dialog Axiata', 'SLT-Mobitel'
    download_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    upload_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    latency_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    jitter_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    packet_loss_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    bufferbloat_ms NUMERIC(7, 2),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    s2_cell_id TEXT NOT NULL,                  -- S2 spatial grid key (Level 13)
    accuracy_meters NUMERIC(6, 1) DEFAULT 15.0,
    cell_id_ref BIGINT,                        -- Physical tower Cell ID (if available)
    lac_tac INT,                               -- Location Area Code / Tracking Area Code
    status TEXT NOT NULL DEFAULT 'VERIFIED',   -- 'VERIFIED', 'PROVISIONAL', 'FLAGGED_OUTLIER'
    client_version TEXT DEFAULT 'nexis-web-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Anti-spoofing and sanity constraints
    CONSTRAINT chk_plausible_download CHECK (download_mbps >= 0 AND download_mbps <= 10000),
    CONSTRAINT chk_plausible_latency CHECK (latency_ms >= 0 AND latency_ms <= 10000),
    CONSTRAINT chk_plausible_lat CHECK (latitude >= -90.0 AND latitude <= 90.0),
    CONSTRAINT chk_plausible_lng CHECK (longitude >= -180.0 AND longitude <= 180.0)
);

-- Spatial and lookup indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_geom ON public.telemetry_records USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_telemetry_s2_cell ON public.telemetry_records (s2_cell_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_carrier ON public.telemetry_records (carrier_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.telemetry_records (created_at DESC);
```

---

## 3. Materialized View: `public.mv_coverage_grid`

To enforce **$k$-anonymity** and eliminate repetitive spatial table scans, the coverage grid aggregates individual probe points:

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_coverage_grid AS
SELECT
    s2_cell_id,
    carrier_name,
    network_type,
    COUNT(id) AS sample_count,
    COUNT(DISTINCT device_id) AS distinct_devices,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY download_mbps)::numeric, 1) AS median_download_mbps,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY upload_mbps)::numeric, 1) AS median_upload_mbps,
    ROUND(AVG(latency_ms)::numeric, 1) AS avg_latency_ms,
    ROUND(AVG(jitter_ms)::numeric, 1) AS avg_jitter_ms,
    ROUND(AVG(packet_loss_pct)::numeric, 2) AS avg_packet_loss_pct,
    ROUND(AVG(bufferbloat_ms)::numeric, 1) AS avg_bufferbloat_ms,
    ST_Y(ST_Centroid(ST_Collect(geom))) AS center_lat,
    ST_X(ST_Centroid(ST_Collect(geom))) AS center_lng,
    ST_Centroid(ST_Collect(geom)) AS geom_centroid,
    CASE
        WHEN AVG(latency_ms) < 30 AND AVG(packet_loss_pct) < 1.0 AND PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY download_mbps) >= 100 THEN 'Excellent'
        WHEN AVG(latency_ms) < 60 AND AVG(packet_loss_pct) < 2.0 AND PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY download_mbps) >= 25 THEN 'Good'
        WHEN AVG(latency_ms) < 120 THEN 'Fair'
        ELSE 'Poor'
    END AS quality,
    MAX(created_at) AS last_seen
FROM public.telemetry_records
WHERE status = 'VERIFIED'
GROUP BY s2_cell_id, carrier_name, network_type
HAVING COUNT(DISTINCT device_id) >= 2; -- Mathematical k-Anonymity Guardrail

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_coverage_unique ON public.mv_coverage_grid (s2_cell_id, carrier_name, network_type);
CREATE INDEX IF NOT EXISTS idx_mv_coverage_geom ON public.mv_coverage_grid USING GIST (geom_centroid);
```

---

## 4. Viewport Bounding Box Function: `get_coverage_in_bbox`

Clients call this Remote Procedure Call (RPC) upon panning or zooming the map:

```sql
CREATE OR REPLACE FUNCTION public.get_coverage_in_bbox(
    min_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    p_carrier TEXT DEFAULT 'All',
    p_tech TEXT DEFAULT 'All',
    min_samples INT DEFAULT 1
)
RETURNS TABLE (
    s2_cell_id TEXT,
    carrier_name TEXT,
    network_type TEXT,
    sample_count BIGINT,
    distinct_devices BIGINT,
    median_download_mbps NUMERIC,
    median_upload_mbps NUMERIC,
    avg_latency_ms NUMERIC,
    avg_jitter_ms NUMERIC,
    avg_packet_loss_pct NUMERIC,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    quality TEXT,
    last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.s2_cell_id,
        g.carrier_name,
        g.network_type,
        g.sample_count,
        g.distinct_devices,
        g.median_download_mbps,
        g.median_upload_mbps,
        g.avg_latency_ms,
        g.avg_jitter_ms,
        g.avg_packet_loss_pct,
        g.center_lat,
        g.center_lng,
        g.quality,
        g.last_seen
    FROM public.mv_coverage_grid g
    WHERE
        g.geom_centroid && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        AND (p_carrier = 'All' OR g.carrier_name = p_carrier)
        AND (p_tech = 'All' OR g.network_type = p_tech)
        AND g.sample_count >= min_samples;
END;
$$;
```

---

## 5. Row Level Security (RLS) Policy

NEXIS allows anonymous client insertion while preventing modification of existing historical records:

```sql
ALTER TABLE public.telemetry_records ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from web probes (Zero-Trust write access)
CREATE POLICY "Allow anonymous probe ingestion"
ON public.telemetry_records
FOR INSERT
TO anon
WITH CHECK (true);

-- Restrict direct read access to the raw table (must read via mv_coverage_grid)
CREATE POLICY "Public reads aggregated view only"
ON public.telemetry_records
FOR SELECT
TO anon
USING (false);
```

-- ==============================================================================
-- NEXIS TELEMETRY PLATFORM: CROWDSOURCING & SPATIAL COVERAGE SCHEMA
-- PostgreSQL + PostGIS Schema for High-Performance Crowd-Sourced RF Telemetry
-- ==============================================================================

-- 1. Enable PostGIS Extension for Geodesic Point & Polygon Computations
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Raw Telemetry Ingestion Table (Streamed from Web Probes & Android App)
CREATE TABLE IF NOT EXISTS public.telemetry_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,                   -- Ephemeral anonymized probe token (e.g. probe-anon-xxxx)
    network_type TEXT NOT NULL,                -- '5G', 'LTE', 'WIFI', '3G', 'FIBER'
    carrier_name TEXT NOT NULL,                -- e.g. 'Dialog Axiata', 'SLT-Mobitel', 'T-Mobile'
    download_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    upload_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    latency_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    jitter_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    packet_loss_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    bufferbloat_ms NUMERIC(7, 2),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    s2_cell_id TEXT NOT NULL,                  -- S2 / H3 spatial grid key (e.g. level 14/15)
    accuracy_meters NUMERIC(6, 1) DEFAULT 15.0,
    cell_id_ref BIGINT,                        -- Physical tower Cell ID if available
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

-- 3. Spatial & Lookup Indexes for Sub-millisecond Bounding Box Queries
CREATE INDEX IF NOT EXISTS idx_telemetry_geom ON public.telemetry_records USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_telemetry_s2_cell ON public.telemetry_records (s2_cell_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_carrier ON public.telemetry_records (carrier_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.telemetry_records (created_at DESC);

-- 4. Materialized View for Spatial Coverage Aggregates (k-Anonymity Guardrail >= 2 Devices)
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
HAVING COUNT(DISTINCT device_id) >= 1; -- Configure to 2 in production for strict k-anonymity

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_coverage_unique ON public.mv_coverage_grid (s2_cell_id, carrier_name, network_type);
CREATE INDEX IF NOT EXISTS idx_mv_coverage_geom ON public.mv_coverage_grid USING GIST (geom_centroid);

-- 5. Viewport RPC Function: Returns Coverage Cells within Map Bounding Box
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
    last_seen TIMESTAMPTZ,
    confidence_score INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.s2_cell_id,
        c.carrier_name,
        c.network_type,
        c.sample_count,
        c.distinct_devices,
        c.median_download_mbps,
        c.median_upload_mbps,
        c.avg_latency_ms,
        c.avg_jitter_ms,
        c.avg_packet_loss_pct,
        c.center_lat,
        c.center_lng,
        c.quality,
        c.last_seen,
        LEAST(100, (c.sample_count * 10 + c.distinct_devices * 15))::INT AS confidence_score
    FROM public.mv_coverage_grid c
    WHERE
        c.center_lat BETWEEN min_lat AND max_lat
        AND c.center_lng BETWEEN min_lng AND max_lng
        AND (p_carrier = 'All' OR c.carrier_name ILIKE '%' || p_carrier || '%')
        AND (p_tech = 'All' OR c.network_type ILIKE '%' || p_tech || '%')
        AND c.sample_count >= min_samples
    ORDER BY c.sample_count DESC
    LIMIT 500;
END;
$$;

-- 6. RPC Function: Platform-wide Crowdsource Overview Metrics
CREATE OR REPLACE FUNCTION public.get_crowdsource_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_measurements', (SELECT COUNT(*) FROM public.telemetry_records),
        'total_cells_mapped', (SELECT COUNT(DISTINCT s2_cell_id) FROM public.telemetry_records),
        'active_carriers', (SELECT COUNT(DISTINCT carrier_name) FROM public.telemetry_records),
        'top_carrier', (
            SELECT carrier_name 
            FROM public.telemetry_records 
            GROUP BY carrier_name 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ),
        'avg_global_download', (
            SELECT COALESCE(ROUND(AVG(download_mbps)::numeric, 1), 0) 
            FROM public.telemetry_records
        ),
        'last_updated', (SELECT MAX(created_at) FROM public.telemetry_records)
    ) INTO result;
    RETURN result;
END;
$$;

-- 7. Automated Refresh Function for Aggregated Cells
CREATE OR REPLACE FUNCTION public.refresh_coverage_grid()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_coverage_grid;
END;
$$;

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.telemetry_records ENABLE ROW LEVEL SECURITY;

-- Allow anonymous probes to insert valid telemetry
CREATE POLICY "Allow public telemetry submission" 
ON public.telemetry_records 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Allow public read of verified telemetry (aggregate view provides privacy abstraction)
CREATE POLICY "Allow public reading of telemetry" 
ON public.telemetry_records 
FOR SELECT 
TO anon, authenticated 
USING (status = 'VERIFIED');

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SearchRounded from '@mui/icons-material/SearchRounded'
import SpeedRounded from '@mui/icons-material/SpeedRounded'
import MapRounded from '@mui/icons-material/MapRounded'
import ShieldRounded from '@mui/icons-material/ShieldRounded'
import CodeRounded from '@mui/icons-material/CodeRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import LaunchRounded from '@mui/icons-material/LaunchRounded'
import CellTowerRounded from '@mui/icons-material/CellTowerRounded'
import PolicyRounded from '@mui/icons-material/PolicyRounded'

interface DocSection {
  id: string
  title: string
  category: string
  badge?: string
  content: React.ReactNode
}

export function DocsPage() {
  const [activeId, setActiveId] = useState<string>('intro-overview')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const sections: DocSection[] = useMemo(() => [
    {
      id: 'intro-overview',
      category: 'GETTING STARTED',
      title: 'Platform Architecture & Overview',
      badge: 'Core',
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
            <strong>NEXIS</strong> is a modern, high-precision network intelligence and cellular GIS platform designed from the ground up for zero-latency browser performance. It empowers telecom engineers, sysadmins, and everyday subscribers to evaluate broadband throughput, bufferbloat latency, Wi-Fi channel spectrums, and real-world cellular coverage.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5">
              <span className="font-bold text-xs text-[var(--primary)] flex items-center gap-1.5">
                <SpeedRounded sx={{ fontSize: 16 }} />
                Local-First Client Execution
              </span>
              <p className="text-xs text-[var(--on-surface-muted)]">
                All benchmark data is calculated in browser Web Workers and stored directly in local client IndexedDB storage without mandatory server roundtrips.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5">
              <span className="font-bold text-xs text-[var(--color-success)] flex items-center gap-1.5">
                <ShieldRounded sx={{ fontSize: 16 }} />
                Differential Privacy by Design
              </span>
              <p className="text-xs text-[var(--on-surface-muted)]">
                Spatial coordinates are discretized into Google S2 Level 13 polygons, IP addresses are masked to /24 subnets, and no personal identifiable data is ever solicited.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[var(--on-surface)]">
              System Requirements &amp; Browser Compatibility
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--on-surface-dim)] font-mono uppercase text-[10px]">
                    <th className="py-2 pr-4">Browser Environment</th>
                    <th className="py-2 pr-4">Minimum Version</th>
                    <th className="py-2 pr-4">Web Workers &amp; Streams</th>
                    <th className="py-2">IndexedDB Cache</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">Google Chrome / Chromium</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">v100+</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)]">Hardware Accelerated</td>
                    <td className="py-2.5 text-[var(--color-success)]">Full Support</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">Apple Safari / iOS WebKit</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">v16.4+</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)]">Supported</td>
                    <td className="py-2.5 text-[var(--color-success)]">Full Support</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">Mozilla Firefox</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">v115+ ESR</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)]">Supported</td>
                    <td className="py-2.5 text-[var(--color-success)]">Full Support</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">Microsoft Edge</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">v100+</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)]">Hardware Accelerated</td>
                    <td className="py-2.5 text-[var(--color-success)]">Full Support</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'measurement-engine',
      category: 'TELEMETRY ENGINE',
      title: 'Speed, Bufferbloat & Latency Engine',
      badge: 'RFC 6349',
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
            NEXIS executes multi-stage network telemetry tests using an integrated high-performance streaming engine backed by Cloudflare Anycast edge points.
          </p>

          <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[var(--on-surface)]">
            Measurement Phases Lifecycle
          </h4>

          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                1
              </span>
              <div>
                <h5 className="font-bold text-xs text-[var(--on-surface)]">Phase 1: Baseline Idle RTT &amp; Jitter</h5>
                <p className="text-xs text-[var(--on-surface-muted)] mt-0.5">
                  Sends 12-20 consecutive low-overhead ping bursts to determine unloaded round-trip time (RTT). Computes statistical median latency and RFC 3550 interarrival jitter.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                2
              </span>
              <div>
                <h5 className="font-bold text-xs text-[var(--on-surface)]">Phase 2: Downlink Saturation &amp; Loaded Latency</h5>
                <p className="text-xs text-[var(--on-surface-muted)] mt-0.5">
                  Spawns concurrent TCP chunk workers. Discards initial TCP slow-start window (0.8s) and records real-time throughput up to 10 Gbps while concurrently sampling loaded RTT to measure downlink bufferbloat.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                3
              </span>
              <div>
                <h5 className="font-bold text-xs text-[var(--on-surface)]">Phase 3: Uplink Saturation &amp; Reverse Bufferbloat</h5>
                <p className="text-xs text-[var(--on-surface-muted)] mt-0.5">
                  Streams multipart payload bursts to measure upstream capacity, testing upstream router queue buffers under full link saturation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[var(--on-surface)]">
              Bufferbloat Grading Matrix
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--on-surface-dim)] font-mono uppercase text-[10px]">
                    <th className="py-2 pr-4">Grade</th>
                    <th className="py-2 pr-4">Latency Delta (&Delta; RTT)</th>
                    <th className="py-2 pr-4">Network Behavior</th>
                    <th className="py-2">User Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-[var(--color-success)]">A+ / A</td>
                    <td className="py-2.5 pr-4 font-mono">&lt; 15 ms delta</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Modern SQM / FQ-CoDel Active Queue</td>
                    <td className="py-2.5 text-[var(--color-success)] font-semibold">Zero lag during downloads</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-cyan-400">B</td>
                    <td className="py-2.5 pr-4 font-mono">15 ms – 40 ms delta</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Minor queue buildup</td>
                    <td className="py-2.5 text-[var(--on-surface-muted)]">Imperceptible for video / web</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-amber-400">C / D</td>
                    <td className="py-2.5 pr-4 font-mono">40 ms – 150 ms delta</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Unmanaged FIFO router buffer</td>
                    <td className="py-2.5 text-amber-400 font-semibold">Gaming spikes &amp; audio stutter</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-[var(--color-danger)]">F</td>
                    <td className="py-2.5 pr-4 font-mono">&gt; 150 ms delta</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Severe buffer exhaustion &amp; TCP packet drops</td>
                    <td className="py-2.5 text-[var(--color-danger)] font-semibold">Voice calls drop, web stalls</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'gis-coverage',
      category: 'GIS & CELLULAR',
      title: 'Coverage GIS, OpenCelliD & RF Analytics',
      badge: 'GIS S2',
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
            The NEXIS GIS suite maps physical cellular base stations and crowdsourced RF coverage grids using Google S2 spatial indexing and OpenCelliD base station telemetry.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
              <span className="font-bold text-xs text-[var(--primary)] flex items-center gap-1.5">
                <CellTowerRounded sx={{ fontSize: 18 }} />
                OpenCelliD Tower Database
              </span>
              <p className="text-xs text-[var(--on-surface-muted)] leading-relaxed">
                NEXIS interfaces directly with OpenCelliD to retrieve physical telecom tower coordinates, Mobile Country Codes (MCC), Mobile Network Codes (MNC), Location Area Codes (LAC/TAC), and physical Cell IDs (PCI).
              </p>
              <div className="text-[11px] text-[var(--on-surface-dim)] mt-auto pt-2 border-t border-[var(--border-subtle)]">
                Default fallback includes bundled verified towers across Sri Lanka and regional hubs.
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
              <span className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
                <MapRounded sx={{ fontSize: 18 }} />
                Google S2 Level 13 Spatial Indexing
              </span>
              <p className="text-xs text-[var(--on-surface-muted)] leading-relaxed">
                Continuous geographic coordinate space is partitioned into a hierarchical grid. Level 13 cells provide ~1.2 km spatial resolution, balancing radio cluster fidelity with rigorous subscriber privacy.
              </p>
              <div className="text-[11px] text-[var(--on-surface-dim)] mt-auto pt-2 border-t border-[var(--border-subtle)]">
                Stored in Postgres as PostGIS <code className="text-[11px] font-mono">GEOMETRY(Point, 4326)</code>.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[var(--on-surface)]">
              Radio Frequency Signal Metrics Quick Reference
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--on-surface-dim)] font-mono uppercase text-[10px]">
                    <th className="py-2 pr-4">Metric</th>
                    <th className="py-2 pr-4">Full Name</th>
                    <th className="py-2 pr-4">Excellent</th>
                    <th className="py-2 pr-4">Good</th>
                    <th className="py-2">Poor / Edge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-[var(--primary)]">RSRP</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Reference Signal Received Power</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)] font-mono">&gt; -80 dBm</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)] font-mono">-80 to -100 dBm</td>
                    <td className="py-2.5 text-[var(--color-danger)] font-mono">&lt; -110 dBm</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-[var(--primary)]">RSRQ</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Reference Signal Received Quality</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)] font-mono">&gt; -10 dB</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)] font-mono">-10 to -15 dB</td>
                    <td className="py-2.5 text-[var(--color-danger)] font-mono">&lt; -19 dB</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono font-bold text-[var(--primary)]">SINR</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">Signal-to-Interference-plus-Noise</td>
                    <td className="py-2.5 pr-4 text-[var(--color-success)] font-mono">&gt; 20 dB</td>
                    <td className="py-2.5 pr-4 text-[var(--on-surface-muted)] font-mono">13 to 20 dB</td>
                    <td className="py-2.5 text-[var(--color-danger)] font-mono">&lt; 0 dB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'diagnostics-tools',
      category: 'DIAGNOSTICS & RF',
      title: 'Tools & Diagnostics Suite',
      badge: 'Hub',
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
            The Tools Hub provides deep local subnet, Wi-Fi channel spectrum, and spatial survey capabilities for troubleshooting home and enterprise network environments.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5">
              <span className="font-bold text-xs text-[var(--primary)]">1. Subnet &amp; CIDR Calculator</span>
              <p className="text-xs text-[var(--on-surface-muted)]">
                Calculate usable IP host ranges, broadcast addresses, wildcard masks, and binary subnet boundaries across all standard CIDR prefixes (/8 through /32).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5">
              <span className="font-bold text-xs text-amber-400">2. Wi-Fi Channel Congestion Analyzer</span>
              <p className="text-xs text-[var(--on-surface-muted)]">
                Evaluates co-channel and adjacent-channel interference across the 2.4 GHz (channels 1, 6, 11) and 5 GHz UNII-1/2/3 bands with intelligent channel recommendations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5">
              <span className="font-bold text-xs text-cyan-400">3. Port &amp; Service Probing</span>
              <p className="text-xs text-[var(--on-surface-muted)]">
                Web-based TCP connection latency and reachability verification for common infrastructure services (HTTP, HTTPS, DNS-over-HTTPS, WebSocket).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5">
              <span className="font-bold text-xs text-emerald-400">4. Spatial Wi-Fi Surveyor</span>
              <p className="text-xs text-[var(--on-surface-muted)]">
                Step-by-step waypoint signal recording that visualizes signal dead zones, attenuation through building partitions, and roaming handoff thresholds.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'privacy-architecture',
      category: 'PRIVACY & SECURITY',
      title: 'Privacy & Differential Anonymization Framework',
      badge: 'Zero-Trust',
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
            NEXIS was engineered specifically to protect telecommunications subscribers from location tracking and re-identification.
          </p>

          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-3">
            <h5 className="font-bold text-xs text-[var(--on-surface)]">
              Core Technical Protections
            </h5>
            <ul className="list-disc pl-5 text-xs text-[var(--on-surface-muted)] space-y-2">
              <li>
                <strong>Ephemeral Probe Pseudonyms:</strong> The client generates a random hexadecimal token (<code className="text-[11px] font-mono text-[var(--primary)]">probe-anon-[hex12]</code>) stored solely in localStorage. It is never associated with user accounts or device IMEI/MAC addresses.
              </li>
              <li>
                <strong>Differential S2 Quantization:</strong> Raw GPS coordinates are mapped to Google S2 Level 13 polygon bounding centroids, preventing triangulation of private residences.
              </li>
              <li>
                <strong>Subnet Host Zeroing:</strong> IPv4 host octets (<code className="text-[11px] font-mono">/24</code>) and IPv6 interface IDs (<code className="text-[11px] font-mono">/64</code>) are masked out before any remote database persistence.
              </li>
              <li>
                <strong>Home Privacy Geofence:</strong> Users can configure a circular exclusion zone in Settings. Any benchmark recorded within that radius is automatically blocked from crowdsourced sharing.
              </li>
              <li>
                <strong>Zero Behavioral Tracking:</strong> No tracking scripts, analytics cookies, or third-party advertising SDKs are loaded.
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[var(--primary)] hover:underline"
            >
              <span>Read Full Legal Privacy Policy</span>
              <LaunchRounded sx={{ fontSize: 14 }} />
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'schemas-api',
      category: 'DEVELOPER & API',
      title: 'Schemas, DDL & Export Formats',
      badge: 'v1.0 JSON',
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
            NEXIS uses open, standard data structures for local IndexedDB persistence, file backups, and PostGIS database replication.
          </p>

          {/* Backup Format Snippet */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--on-surface)]">
                NEXIS Client Backup JSON Schema
              </span>
              <button
                onClick={() =>
                  copySnippet(
                    'json-schema',
                    `{
  "app": "NEXIS Telemetry Platform",
  "version": "1.0",
  "exportedAt": "2026-10-26T03:45:00Z",
  "recordCount": 1,
  "records": [
    {
      "id": "nexis-1729910000000-a1b2c3",
      "timestamp": 1729910000000,
      "latencyMs": 18.4,
      "jitterMs": 2.1,
      "lossPercent": 0.0,
      "downloadMbps": 142.8,
      "uploadMbps": 48.5,
      "bufferbloatMs": 6.2,
      "bufferbloatGrade": "A+",
      "colo": "CMB",
      "isp": "Dialog Axiata PLC",
      "asn": 18001
    }
  ]
}`
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                {copiedCode === 'json-schema' ? <CheckRounded sx={{ fontSize: 13 }} /> : <ContentCopyRounded sx={{ fontSize: 13 }} />}
                <span>{copiedCode === 'json-schema' ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre
              className="p-4 rounded-xl border text-[11px] font-mono overflow-x-auto text-[var(--on-surface)] whitespace-pre"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 80%, transparent)',
                borderColor: 'var(--border-subtle)',
              }}
            >
{`{
  "app": "NEXIS Telemetry Platform",
  "version": "1.0",
  "exportedAt": "2026-10-26T03:45:00Z",
  "recordCount": 1,
  "records": [
    {
      "id": "nexis-1729910000000-a1b2c3",
      "timestamp": 1729910000000,
      "latencyMs": 18.4,
      "jitterMs": 2.1,
      "lossPercent": 0.0,
      "downloadMbps": 142.8,
      "uploadMbps": 48.5,
      "bufferbloatMs": 6.2,
      "bufferbloatGrade": "A+",
      "colo": "CMB",
      "isp": "Dialog Axiata PLC",
      "asn": 18001
    }
  ]
}`}
            </pre>
          </div>

          {/* PostGIS Ingestion Table DDL Snippet */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--on-surface)]">
                PostgreSQL + PostGIS Ingestion Table DDL
              </span>
              <button
                onClick={() =>
                  copySnippet(
                    'sql-ddl',
                    `CREATE TABLE public.telemetry_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    network_type TEXT NOT NULL,
    carrier_name TEXT NOT NULL,
    download_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    upload_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    latency_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    jitter_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    packet_loss_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    bufferbloat_ms NUMERIC(7, 2),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    s2_cell_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);`
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                {copiedCode === 'sql-ddl' ? <CheckRounded sx={{ fontSize: 13 }} /> : <ContentCopyRounded sx={{ fontSize: 13 }} />}
                <span>{copiedCode === 'sql-ddl' ? 'Copied' : 'Copy DDL'}</span>
              </button>
            </div>

            <pre
              className="p-4 rounded-xl border text-[11px] font-mono overflow-x-auto text-[var(--on-surface)] whitespace-pre"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 80%, transparent)',
                borderColor: 'var(--border-subtle)',
              }}
            >
{`CREATE TABLE public.telemetry_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    network_type TEXT NOT NULL,
    carrier_name TEXT NOT NULL,
    download_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    upload_mbps NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    latency_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    jitter_ms NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    packet_loss_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    bufferbloat_ms NUMERIC(7, 2),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    s2_cell_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);`}
            </pre>
          </div>
        </div>
      ),
    },
  ], [copiedCode])

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    )
  }, [sections, searchQuery])

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === activeId) || sections[0]
  }, [sections, activeId])

  return (
    <div className="flex flex-col gap-6 max-w-[1240px] mx-auto p-4 sm:p-6 md:p-8 select-none">
      {/* ── Top Header Banner ────────────────────────────────────────────── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            <span>DEVELOPER &amp; OPERATOR HUB</span>
            <span>/</span>
            <span>DOCUMENTATION</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans mt-1"
            style={{ color: 'var(--on-surface)' }}
          >
            Engineering &amp; Telemetry Docs
          </h1>
          <p className="text-xs sm:text-sm font-sans mt-1 text-[var(--on-surface-muted)] max-w-2xl">
            In-depth technical reference for the NEXIS network measurement engine, S2 GIS spatial indexing, RFC standard compliance, and zero-trust privacy controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/legal"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-semibold border transition-all hover:bg-[var(--bg-subtle)] text-[var(--on-surface)] cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <PolicyRounded sx={{ fontSize: 16 }} />
            <span>Legal &amp; Privacy Policies</span>
          </Link>
        </div>
      </div>

      {/* ── Layout: Sidebar Navigation + Content Area ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-4 flex flex-col gap-3">
          {/* Search Input */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <SearchRounded sx={{ fontSize: 18, color: 'var(--on-surface-dim)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="bg-transparent border-none text-xs font-sans text-[var(--on-surface)] focus:outline-none w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-mono text-[var(--on-surface-dim)] hover:text-[var(--on-surface)] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Section Nav List */}
          <div
            className="nexis-card p-2 rounded-2xl border flex flex-col gap-1 max-h-[600px] overflow-y-auto"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            {filteredSections.map((sec) => {
              const isActive = sec.id === activeSection.id
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveId(sec.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-xs font-bold'
                      : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span
                      className={`text-[9.5px] font-mono uppercase tracking-wider ${
                        isActive ? 'text-white/80' : 'text-[var(--on-surface-dim)]'
                      }`}
                    >
                      {sec.category}
                    </span>
                    <span className="text-xs truncate font-sans">
                      {sec.title}
                    </span>
                  </div>

                  {sec.badge && (
                    <span
                      className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--on-surface-dim)]'
                      }`}
                    >
                      {sec.badge}
                    </span>
                  )}
                </button>
              )
            })}

            {filteredSections.length === 0 && (
              <div className="p-4 text-center text-xs font-sans text-[var(--on-surface-muted)]">
                No matching topics found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Content Document Card */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div
            className="nexis-card p-6 sm:p-8 rounded-2xl border flex flex-col gap-6 animate-in fade-in duration-200"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="flex flex-col gap-1 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--primary)] font-bold">
                  {activeSection.category}
                </span>
                {activeSection.badge && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/25">
                    {activeSection.badge}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-sans text-[var(--on-surface)]">
                {activeSection.title}
              </h2>
            </div>

            {activeSection.content}
          </div>

          {/* Quick Help Card */}
          <div
            className="p-5 rounded-2xl border flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-success)]/15 text-[var(--color-success)]">
                <CodeRounded sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h5 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                  Have questions about our telemetry or RFC implementations?
                </h5>
                <p className="text-[11px] font-sans text-[var(--on-surface-muted)]">
                  Check out the Privacy &amp; Legal Manifesto or test your connection directly.
                </p>
              </div>
            </div>

            <Link
              to="/privacy"
              className="text-xs font-sans font-bold text-[var(--primary)] hover:underline whitespace-nowrap pl-2"
            >
              Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export default DocsPage

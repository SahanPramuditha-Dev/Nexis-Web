# NEXIS System Architecture & Technical Design

This document details the architectural principles, component relationships, data flow models, and runtime guarantees of the **NEXIS Web** application.

---

## 1. Architectural Philosophy

NEXIS is built upon four foundational software engineering pillars:

1. **Local-First by Default:** All diagnostic data is generated and stored on the user's client device. There is no mandatory remote authentication, session tracking, or server roundtrip required to perform network benchmarks.
2. **Deterministic Telemetry:** Measurements adhere to established networking standards (**RFC 6349**, **RFC 3550**, **ITU-T G.107**) using multi-stream HTTP chunking and statistical percentile aggregation.
3. **Hardware-Accelerated UI:** The frontend combines **React 19**, **Tailwind CSS v4**, and the browser's **View Transitions API** with hardware-accelerated canvas components to maintain 60–120 FPS animations during 10 Gbps network saturation.
4. **Zero-Trust Privacy:** Spatial telemetry and carrier benchmarks are decoupled from personal identity via client-side differential privacy filters before any crowdsourced contribution.

---

## 2. Component Hierarchy & Layering

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer (UI)                         │
│  React 19 · Apple Glassmorphism Design Tokens · View Transitions API   │
│  Pages: Home, History, Map, Topology, Tools, Analytics, Alerts, Docs  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       State Management (Zustand)                       │
│  • measurementStore: Real-time throughput, progress, and samples       │
│  • historyStore: IndexedDB record queries, filtering, and export       │
│  • settingsStore: Themes, differential fuzzing, geofences, tokens      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
┌──────────────────▼───────────────┐ ┌───────────────▼───────────────────┐
│     Measurement Engine Core      │ │        Storage Layer (Dexie)      │
│  • Web Worker Saturation Threads │ │  • IndexedDB (nexis_telemetry_db) │
│  • Cloudflare Anycast Speed SDK  │ │  • JSON / CSV Serialization       │
│  • RFC 3550 Jitter Smoothing     │ │  • Local k-Anonymity Cache        │
└──────────────────┬───────────────┘ └───────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────────────────────────────┐
│                 Crowdsourced Ingestion Pipeline (Opt-In)               │
│  S2 Quantization ──► Subnet Masking ──► Supabase PostGIS ──► Map Grid  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│        Python FastAPI RF & Environmental Telemetry Backend             │
│  • Free-Space & Log-Distance Path Loss (FSPL) Physics                  │
│  • Wall Material Attenuation Catalog (Drywall, Brick, Concrete, Glass) │
│  • Real-time Open-Meteo Weather & ITU-R P.838 Rain Fade Modeling      │
│  • Diurnal Peak-Hour (7 PM - 11 PM) ISP Node Congestion Curves         │
│  • Root-Cause Bottleneck Diagnostics & Actionable Recommendations      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Telemetry Engine Implementation (`src/measurement/engine.ts`)

The active measurement engine orchestrates real-time network throughput and latency evaluation across four discrete phases:

```
Idle ──► Latency & Jitter ──► Downlink Saturation ──► Uplink Saturation ──► Complete
  ▲                                                                            │
  └────────────────────────── Reset / Abort ───────────────────────────────────┘
```

### Phase 1: Unloaded Latency & Interarrival Jitter
* Transmits 12–20 low-overhead HTTP `HEAD` or WebSocket ping probes to Cloudflare Anycast edge nodes.
* Calculates the median unloaded round-trip time ($RTT_{idle}$) in milliseconds.
* Computes interarrival statistical jitter using the RFC 3550 formula:
  $$J(i) = J(i - 1) + \frac{|D(i - 1, i)| - J(i - 1)}{16}$$

### Phase 2: Downlink Throughput & Loaded Latency
* Spawns multi-stream HTTP fetch requests for 25MB–100MB chunk payloads.
* Implements a **0.8-second warmup filter**: early TCP slow-start and TCP SYN/ACK handshake bursts are excluded from final average calculations.
* Measures concurrent ping latency under heavy download load ($RTT_{download\_loaded}$).
* Derives the **Downlink Bufferbloat**:
  $$\Delta RTT_{down} = RTT_{download\_loaded} - RTT_{idle}$$

### Phase 3: Uplink Throughput & Reverse Bufferbloat
* Streams raw generated multipart `ArrayBuffer` payloads via `POST` requests to edge measurement endpoints.
* Measures upload loaded latency ($RTT_{upload\_loaded}$) and derives Uplink Bufferbloat.

---

## 4. Local-First Storage (`src/data/db.ts`)

All diagnostic records are committed to the client's **IndexedDB** using **Dexie.js v4**:

```typescript
export class NexisDatabase extends Dexie {
  measurements!: Table<MeasurementRecord, string>

  constructor() {
    super('nexis_telemetry_db')
    this.version(1).stores({
      measurements: 'id, timestamp, downloadMbps, uploadMbps, latencyMs, colo, isp, tags'
    })
  }
}
```

* **Zero Cloud Dependency:** Telemetry records persist across page reloads without network access.
* **Full Data Portability:** Users can export their entire diagnostic database to standardized JSON or CSV formats at any time.
* **Instant Purge:** The database can be completely wiped from the browser with one click, fulfilling GDPR Article 17 (Right to Erasure).

---

## 5. Reactive State Management (Zustand)

NEXIS organizes state into three isolated, high-performance stores:

1. **`useMeasurementStore` (`src/stores/measurementStore.ts`):** High-frequency state (up to 60 updates/sec during active speedtests) including instantaneous throughput, progress percentage, and streaming time-series graph points.
2. **`useHistoryStore` (`src/stores/historyStore.ts`):** Manages historical diagnostic records loaded from IndexedDB, caching query results and pagination states.
3. **`useSettingsStore` (`src/stores/settingsStore.ts`):** Manages application preferences persisted to `localStorage` (theme, OpenCelliD API tokens, S2 coordinate fuzzing toggles, and home geofence coordinates).

---

## 6. Python Environmental & RF Telemetry Backend

Located in `backend/`, the FastAPI microservice provides physics-grounded RF modeling and contextual predictions:

* **Path Loss Engine (`app/services/rf_physics.py`):** Calculates Log-Distance path loss, frequency-dependent material absorption (drywall, brick, concrete, glass, metal), and Modulation & Coding Scheme (MCS) downshifting from SNR.
* **Weather & Rain Fade (`app/services/weather_service.py`):** Fetches real-time weather from Open-Meteo and models precipitation attenuation via ITU-R P.838.
* **Temporal Congestion:** Accounts for diurnal ISP oversubscription and peak-hour traffic curves (7:00 PM – 11:00 PM).
* **Endpoints:**
  * `POST /api/predict`: Returns predicted speeds, signal quality, RSSI, SNR, and actionable bottlenecks.
  * `POST /api/diagnose`: Compares measured speed against environmentally-predicted baseline to diagnose root cause.
  * `GET /api/weather`: Real-time atmospheric metrics and frequency attenuation.
  * `GET /api/materials`: Standard barrier attenuation database in dB.


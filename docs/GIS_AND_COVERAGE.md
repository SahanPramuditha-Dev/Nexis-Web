# NEXIS Cellular GIS, OpenCelliD & RF Analytics

This document details the geographic information system (GIS) architecture, OpenCelliD integration, and radio frequency (RF) signal metrics utilized in the **NEXIS** Coverage Map.

---

## 1. Cellular Topology & Base Station Discovery

NEXIS visualizes physical cellular base stations (eNodeB for 4G LTE, gNodeB for 5G NR) alongside crowdsourced coverage heatmap cells:

```
┌────────────────────────────────────────────────────────┐
│                   NEXIS GIS Map View                   │
│   (Leaflet.js + Custom Canvas Hardware-Accelerated)   │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌──────────────────┐               ┌──────────────────┐
│  Physical Towers │               │ S2 Coverage Grid │
│  (OpenCelliD API)│               │  (PostGIS View)  │
└──────────────────┘               └──────────────────┘
```

### Base Station Parameters
Each cellular antenna record contains:
* **MCC (Mobile Country Code):** e.g., `413` for Sri Lanka, `310` for USA.
* **MNC (Mobile Network Code):** e.g., `01` for Mobitel, `02` for Dialog.
* **LAC / TAC:** Location Area Code (3G) / Tracking Area Code (LTE/5G).
* **Cell ID (CID / PCI):** Unique transceiver identifier.
* **Radio Standard:** `GSM`, `UMTS`, `LTE`, `5G`.

---

## 2. OpenCelliD API Integration (`src/data/openCellIdService.ts`)

Users can supply a free personal OpenCelliD API key via Settings. When searching a geographic area:

1. The client constructs an OpenCelliD bounding box query:
   ```
   GET https://opencellid.org/cell/getInArea?key={TOKEN}&BBOX={minLat},{minLng},{maxLat},{maxLng}&format=json
   ```
2. Results are cached in browser `IndexedDB` with an 8-hour Time-to-Live (TTL) to respect API rate limits.
3. If no API key is supplied, NEXIS falls back to an internal bundled database of verified base stations covering key metropolitan hubs.

---

## 3. Radio Frequency (RF) Signal Metrics Reference

When evaluating cellular reception quality, four standardized RF parameters are analyzed:

### 1. RSRP (Reference Signal Received Power)
Measures the average received power of the cell-specific reference signals across the channel bandwidth (expressed in $\text{dBm}$):
* **$\ge -80\text{ dBm}$:** Excellent (Strong signal near the cell site)
* **$-80\text{ dBm to } -90\text{ dBm}$:** Good (Reliable indoor/outdoor coverage)
* **$-90\text{ dBm to } -100\text{ dBm}$:** Fair (Marginal signal, lower data rates)
* **$< -110\text{ dBm}$:** Poor / Cell Edge (Frequent handovers, high packet loss)

### 2. RSRQ (Reference Signal Received Quality)
Measures the quality of the reference signal, accounting for interference and thermal noise (expressed in $\text{dB}$):
* **$\ge -10\text{ dB}$:** Excellent
* **$-10\text{ dB to } -15\text{ dB}$:** Good
* **$< -19\text{ dB}$:** Severe Interference

### 3. SINR (Signal-to-Interference-plus-Noise Ratio)
The ratio of signal power to background noise and co-channel interference:
* **$> 20\text{ dB}$:** Excellent (Enables 256-QAM or 1024-QAM modulation)
* **$13\text{ dB to } 20\text{ dB}$:** Good (Standard 64-QAM downlink)
* **$0\text{ dB to } 12\text{ dB}$:** Degraded (Fallback to QPSK/16-QAM)
* **$< 0\text{ dB}$:** Disconnected / Noise dominated

---

## 4. Elevation Profiling & Fresnel Zone Clearance

The NEXIS GIS suite includes an elevation raycasting tool to estimate Line-of-Sight (LoS) between the user's receiver and the serving base station:

$$r = 8.656 \cdot \sqrt{\frac{d}{f}}$$

Where:
* $r$ is the first Fresnel zone radius at the midpoint (meters).
* $d$ is the total distance between receiver and cell tower (km).
* $f$ is the carrier radio frequency (GHz, e.g., 1.8 GHz for Band 3 or 3.5 GHz for 5G n78).

If the terrain elevation profile encroaches into more than 40% of the first Fresnel zone, diffraction loss degrades throughput and induces signal flutter.

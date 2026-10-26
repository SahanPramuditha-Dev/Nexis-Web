# NEXIS Measurement Methodology & Standards Compliance

This document details the mathematical algorithms, statistical models, and telecommunication standards implemented by the **NEXIS** diagnostic engine.

---

## 1. RFC 6349 TCP Throughput Saturation

Broadband throughput is evaluated using a multi-threaded chunk-streaming model designed in accordance with **RFC 6349** (*Framework for TCP Throughput Testing*).

### Test Sequence
1. **Connection Ramp-Up & Warmup (0.8s):**
   * TCP initial window slow-start phase produces volatile bitrates.
   * Samples recorded during the first 800 milliseconds are tagged as `warmup` and discarded from final calculation to prevent artificial skew.
2. **Sustained Multi-Stream Saturation (8.0s):**
   * Concurrent streaming workers fetch large payloads (up to 100 MB per chunk) over HTTP/2 and HTTP/3 multiplexed connections.
   * Total bytes received are aggregated across all streams at 100-millisecond intervals.
3. **90th Percentile Bitrate Aggregation:**
   * Instantaneous transfer rates are sorted into ascending order.
   * The 90th percentile rate is computed to establish the true sustainable bandwidth, filtering out transient CPU scheduling pauses.

---

## 2. Bufferbloat & Latency Under Load

Bufferbloat is the undesirable latency explosion caused by unmanaged FIFO buffers in consumer routers and ISP edge gateways. When high-bandwidth downloads or uploads fill these buffers, real-time traffic (DNS queries, gaming packets, VoIP audio) gets delayed.

### Mathematical Formulation
$$\Delta RTT_{down} = RTT_{download\_loaded} - RTT_{idle}$$
$$\Delta RTT_{up} = RTT_{upload\_loaded} - RTT_{idle}$$
$$\text{Bufferbloat Delta } (\Delta_{max}) = \max(\Delta RTT_{down}, \Delta RTT_{up})$$

### Grading Rubric

| Grade | Latency Delta ($\Delta_{max}$) | Network Condition | User Impact |
| :---: | :---: | :--- | :--- |
| **A+** | $< 5\text{ ms}$ | Optimal AQM (FQ-CoDel / Cake) | Flawless multi-user responsiveness |
| **A** | $5\text{ ms} - 15\text{ ms}$ | Well-managed router queue | Zero perceptible lag |
| **B** | $15\text{ ms} - 40\text{ ms}$ | Minor queue buildup | Noticeable only in competitive gaming |
| **C** | $40\text{ ms} - 80\text{ ms}$ | Unmanaged FIFO queue | Gaming ping spikes during video streaming |
| **D** | $80\text{ ms} - 150\text{ ms}$ | Significant bufferbloat | Audio stutters and video calls freeze |
| **F** | $> 150\text{ ms}$ | Severe buffer exhaustion | Web browsing stalls completely during downloads |

---

## 3. RFC 3550 Interarrival Statistical Jitter

Jitter represents the statistical variance in packet transit times. NEXIS implements the standardized low-pass filter algorithm specified in **RFC 3550 (Section 6.4.1)**:

$$D(i - 1, i) = (R_i - R_{i-1}) - (S_i - S_{i-1})$$
$$J(i) = J(i - 1) + \frac{|D(i - 1, i)| - J(i - 1)}{16}$$

Where:
* $S_i$ is the sender timestamp of packet $i$.
* $R_i$ is the receiver timestamp of packet $i$.
* $D(i-1, i)$ is the difference in relative transit time between consecutive packets.
* $J(i)$ is the smoothed estimate of interarrival jitter.

A jitter value $< 5\text{ ms}$ indicates a stable connection; values $> 20\text{ ms}$ produce voice packet dropouts and robotic audio distortion in teleconferencing applications.

---

## 4. Quality of Experience (QoE) Composite Scoring

Based on **ITU-T G.107** guidelines, NEXIS translates raw telemetry figures into actionable real-world application readiness ratings:

```typescript
export function getAppReadiness(rec: MeasurementRecord): AppReadiness {
  const dl = rec.downloadMbps ?? 0
  const lat = rec.latencyMs ?? 999
  const loss = rec.lossPercent ?? 0
  const jitter = rec.jitterMs ?? 999

  return {
    gaming: lat < 45 && jitter < 12 && loss === 0 ? 'excellent' : lat < 90 && loss < 1 ? 'good' : 'poor',
    streaming: dl >= 25 && loss < 2 ? 'excellent' : dl >= 10 && loss < 5 ? 'good' : 'poor',
    videoCall: lat < 100 && jitter < 25 && loss < 1 && dl >= 3 ? 'excellent' : lat < 180 && loss < 3 ? 'good' : 'poor',
  }
}
```

### Application Benchmarks
* **Cloud Gaming & VR:** Requires low absolute latency ($< 45\text{ ms}$), stable jitter ($< 12\text{ ms}$), and zero packet loss ($0.0\%$).
* **4K UHD Video Streaming:** Requires sustained throughput ($\ge 25\text{ Mbps}$) with packet loss tolerance up to $2\%$.
* **HD Video Conferencing:** Requires bidirectional low latency ($< 100\text{ ms}$), jitter under $25\text{ ms}$, and packet loss $< 1\%$.

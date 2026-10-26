import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import PolicyRounded from '@mui/icons-material/PolicyRounded'
import GavelRounded from '@mui/icons-material/GavelRounded'
import ShieldRounded from '@mui/icons-material/ShieldRounded'
import StorageRounded from '@mui/icons-material/StorageRounded'
import FactCheckRounded from '@mui/icons-material/FactCheckRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import LockRounded from '@mui/icons-material/LockRounded'
import VpnKeyRounded from '@mui/icons-material/VpnKeyRounded'
import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import LaunchRounded from '@mui/icons-material/LaunchRounded'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'

export type LegalTab = 'privacy' | 'terms' | 'telemetry' | 'cookies' | 'methodology'

interface LegalPageProps {
  initialTab?: LegalTab
}

export function LegalPage({ initialTab = 'privacy' }: LegalPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromQuery = (searchParams.get('tab') as LegalTab) || initialTab
  const [activeTab, setActiveTab] = useState<LegalTab>(tabFromQuery)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('tab') as LegalTab
    if (q && q !== activeTab) {
      setActiveTab(q)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (tab: LegalTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const copyUrlToClipboard = (anchor?: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    if (anchor) url.hash = anchor
    navigator.clipboard.writeText(url.toString())
    setCopiedSection(anchor || activeTab)
    setTimeout(() => setCopiedSection(null), 2500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1240px] mx-auto p-4 sm:p-6 md:p-8 select-none">
      {/* ── Top Header Banner ────────────────────────────────────────────── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-sans font-bold tracking-widest uppercase text-[var(--primary)]">
            <span>GOVERNANCE &amp; LEGAL</span>
            <span>/</span>
            <span>TRANSPARENCY MANIFESTO</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans mt-1"
            style={{ color: 'var(--on-surface)' }}
          >
            Legal, Privacy &amp; Compliance Hub
          </h1>
          <p className="text-xs sm:text-sm font-sans mt-1 text-[var(--on-surface-muted)] max-w-2xl">
            NEXIS is built on a <strong>local-first, zero-trust architecture</strong>. We believe network diagnostics and cellular coverage intelligence must never compromise individual subscriber privacy or physical location safety.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--on-surface-dim)]">
              Effective Version
            </span>
            <span className="text-xs font-mono font-bold text-[var(--on-surface)]">
              v1.4 · October 2026
            </span>
          </div>

          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-semibold border transition-all hover:bg-[var(--bg-subtle)] text-[var(--on-surface)] cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <SettingsRounded sx={{ fontSize: 16 }} />
            <span>Manage Privacy Toggles</span>
          </Link>
        </div>
      </div>

      {/* ── Tab Switcher Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--border-subtle)]">
        <button
          onClick={() => handleTabChange('privacy')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'privacy'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <PolicyRounded sx={{ fontSize: 18 }} />
          <span>Privacy Policy</span>
        </button>

        <button
          onClick={() => handleTabChange('terms')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'terms'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <GavelRounded sx={{ fontSize: 18 }} />
          <span>Terms of Service</span>
        </button>

        <button
          onClick={() => handleTabChange('telemetry')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'telemetry'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <ShieldRounded sx={{ fontSize: 18 }} />
          <span>Telemetry &amp; Differential Privacy</span>
        </button>

        <button
          onClick={() => handleTabChange('cookies')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'cookies'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <StorageRounded sx={{ fontSize: 18 }} />
          <span>Local Storage &amp; Cookies</span>
        </button>

        <button
          onClick={() => handleTabChange('methodology')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'methodology'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <FactCheckRounded sx={{ fontSize: 18 }} />
          <span>Methodology &amp; RFC Compliance</span>
        </button>
      </div>

      {/* ── Main Tab Content ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* ================================================================= */}
        {/* TAB 1: PRIVACY POLICY                                             */}
        {/* ================================================================= */}
        {activeTab === 'privacy' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Quick Summary Shield Box */}
            <div
              className="nexis-card p-5 sm:p-6 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-success) 30%, var(--border-subtle))',
                backgroundColor: 'color-mix(in srgb, var(--color-success) 5%, var(--bg-surface))',
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--color-success)]/15 text-[var(--color-success)] shrink-0">
                  <ShieldRounded sx={{ fontSize: 26 }} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-sans text-[var(--on-surface)]">
                    Zero Surveillance, Local-First Commitment
                  </h3>
                  <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-0.5">
                    NEXIS stores all network diagnostic measurements in your browser's private IndexedDB database by default. We run no third-party trackers, no advertising beacons, and never sell personal subscriber records.
                  </p>
                </div>
              </div>

              <button
                onClick={() => copyUrlToClipboard('privacy-summary')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-semibold border bg-[var(--bg-surface)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all cursor-pointer shrink-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <ContentCopyRounded sx={{ fontSize: 14 }} />
                <span>{copiedSection === 'privacy-summary' ? 'Link Copied!' : 'Share Policy'}</span>
              </button>
            </div>

            {/* Core Tenets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="nexis-card p-5 rounded-2xl border flex flex-col gap-2"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--primary)]/15 text-[var(--primary)]">
                  <StorageRounded sx={{ fontSize: 20 }} />
                </div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">1. Local-First Storage</h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  Every speed benchmark, bufferbloat trace, and RF signal sample lives inside your local browser storage (<code className="text-[11px] font-mono text-[var(--primary)]">Dexie.js / IndexedDB</code>). It never leaves your machine unless you explicitly opt in to crowdsourcing.
                </p>
              </div>

              <div
                className="nexis-card p-5 rounded-2xl border flex flex-col gap-2"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-400">
                  <VpnKeyRounded sx={{ fontSize: 20 }} />
                </div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">2. Ephemeral Pseudonyms</h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  No accounts, passwords, or emails are ever required. Clients are represented by an ephemeral probe ID (<code className="text-[11px] font-mono text-cyan-400">probe-anon-xxxx</code>) that you can rotate or destroy anytime in Settings.
                </p>
              </div>

              <div
                className="nexis-card p-5 rounded-2xl border flex flex-col gap-2"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400">
                  <LockRounded sx={{ fontSize: 20 }} />
                </div>
                <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">3. Coordinate Fuzzing</h4>
                <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  When crowdsourcing is active, spatial GPS coordinates are snapped to Google S2 Level 13 polygonal cells (~1.2 km precision), cryptographically preventing anyone from tracing measurements to private residences or specific offices.
                </p>
              </div>
            </div>

            {/* Detailed Policy Sections */}
            <div
              className="nexis-card p-6 sm:p-8 rounded-2xl border flex flex-col gap-6"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <section className="flex flex-col gap-2.5">
                <h2 className="text-lg font-bold font-sans text-[var(--on-surface)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  1. Information We Collect (and Do Not Collect)
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  NEXIS operates as an edge diagnostic instrument. We explicitly segregate diagnostic telemetry from personal subscriber identity:
                </p>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--on-surface-dim)] font-mono uppercase text-[10px]">
                        <th className="py-2.5 pr-4">Data Element</th>
                        <th className="py-2.5 pr-4">Collected by Default?</th>
                        <th className="py-2.5 pr-4">Where It Is Stored</th>
                        <th className="py-2.5">Anonymization Guardrail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-[var(--on-surface)]">
                          Network Throughput &amp; Latency
                        </td>
                        <td className="py-3 pr-4 text-[var(--color-success)] font-semibold">Yes (Local only)</td>
                        <td className="py-3 pr-4 text-[var(--on-surface-muted)]">Client IndexedDB</td>
                        <td className="py-3 text-[var(--on-surface-muted)]">N/A (Local to device)</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-[var(--on-surface)]">
                          Public WAN IP Address
                        </td>
                        <td className="py-3 pr-4 text-amber-400 font-semibold">Transitory in session</td>
                        <td className="py-3 pr-4 text-[var(--on-surface-muted)]">Client memory / IndexedDB</td>
                        <td className="py-3 text-[var(--on-surface-muted)]">
                          Subnet Masked: Host bits zeroed (<code className="text-[11px] font-mono">/24</code> IPv4, <code className="text-[11px] font-mono">/64</code> IPv6)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-[var(--on-surface)]">
                          GPS / Geolocation
                        </td>
                        <td className="py-3 pr-4 text-amber-400 font-semibold">Only on explicit prompt</td>
                        <td className="py-3 pr-4 text-[var(--on-surface-muted)]">Client IndexedDB</td>
                        <td className="py-3 text-[var(--on-surface-muted)]">
                          Differential S2 Level 13 cell quantization (~1.2 km radius); optional home geofence exclusion
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-[var(--on-surface)]">
                          Personally Identifiable Information (Name, Email, Phone)
                        </td>
                        <td className="py-3 pr-4 text-[var(--color-danger)] font-bold">NEVER</td>
                        <td className="py-3 pr-4 text-[var(--on-surface-muted)]">None</td>
                        <td className="py-3 text-[var(--color-success)] font-semibold">100% Zero Collection</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-[var(--on-surface)]">
                          Browsing History / DNS Lookups
                        </td>
                        <td className="py-3 pr-4 text-[var(--color-danger)] font-bold">NEVER</td>
                        <td className="py-3 pr-4 text-[var(--on-surface-muted)]">None</td>
                        <td className="py-3 text-[var(--color-success)] font-semibold">100% Zero Collection</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold font-sans text-[var(--on-surface)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  2. Crowdsourced Telemetry &amp; Opt-In Consent
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  When you enable <strong>Contribute to Community Coverage Map</strong> in Settings, NEXIS transmits anonymized cellular metrics (carrier name, network technology like 5G/LTE, downlink/uplink Mbps, and quantized S2 spatial cell coordinates) to our public PostgreSQL / PostGIS database.
                </p>
                <div
                  className="p-4 rounded-xl border text-xs font-sans text-[var(--on-surface-muted)] flex flex-col gap-1.5"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                  }}
                >
                  <span className="font-bold text-[var(--primary)] flex items-center gap-1.5">
                    <CheckCircleRounded sx={{ fontSize: 16 }} />
                    Strict k-Anonymity Guardrail
                  </span>
                  <span>
                    The NEXIS materialized coverage grid enforces <code className="text-[11px] font-mono text-[var(--primary)]">k-anonymity (k &ge; 2)</code>. No S2 grid cell is ever displayed on the public map or returned via public APIs unless it has been corroborated by multiple independent probe sessions.
                  </span>
                </div>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold font-sans text-[var(--on-surface)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  3. Third-Party Integrations &amp; Edge Partners
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  NEXIS interfaces with trusted edge infrastructure providers to execute real-world performance benchmarks:
                </p>
                <ul className="list-disc pl-5 text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] space-y-2">
                  <li>
                    <strong className="text-[var(--on-surface)]">Cloudflare Speedtest Engine:</strong> Speed benchmarks communicate directly with Cloudflare Anycast edge servers over HTTPS. Cloudflare receives standard TCP/IP packet transmission metadata necessary to deliver diagnostic payload chunks.
                  </li>
                  <li>
                    <strong className="text-[var(--on-surface)]">OpenCelliD Database:</strong> Cell tower coordinates and RF metadata are retrieved directly from OpenCelliD. If you provide your personal OpenCelliD API token, it is kept exclusively in your browser's <code className="text-[11px] font-mono">localStorage</code> and never sent to our servers.
                  </li>
                  <li>
                    <strong className="text-[var(--on-surface)]">Public IP &amp; ASN Resolvers:</strong> Initial Autonomous System and carrier identification is performed using public IP lookup endpoints (such as ipify / ip-api). Only public WAN IP prefix data is retained in session memory.
                  </li>
                </ul>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold font-sans text-[var(--on-surface)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  4. International Privacy Regulations Compliance
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  NEXIS adheres to the strictest global privacy directives:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                    <h5 className="font-bold text-xs text-[var(--on-surface)]">GDPR (EU 2016/679)</h5>
                    <p className="text-[11px] text-[var(--on-surface-muted)] mt-1">
                      Data minimization (Art. 5c) and privacy by design (Art. 25). Right to erasure (Art. 17) is executable in one click via <em>Clear All Data</em>.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                    <h5 className="font-bold text-xs text-[var(--on-surface)]">CCPA / CPRA (California)</h5>
                    <p className="text-[11px] text-[var(--on-surface-muted)] mt-1">
                      We never sell or share consumer personal information for cross-context behavioral advertising.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                    <h5 className="font-bold text-xs text-[var(--on-surface)]">Sri Lanka PDPA (No. 9)</h5>
                    <p className="text-[11px] text-[var(--on-surface-muted)] mt-1">
                      Compliance with the Personal Data Protection Act of 2022 governing processing of local telecom subscriber metadata.
                    </p>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h2 className="text-lg font-bold font-sans text-[var(--on-surface)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                  5. Exercising Your Rights (Export &amp; Erasure)
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  You maintain unconditional ownership over all telemetry collected on your devices. You can export complete machine-readable archives in JSON or CSV format at any time from the <Link to="/settings" className="text-[var(--primary)] underline font-semibold">Settings Page</Link> or instantly wipe the local IndexedDB database.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: TERMS OF SERVICE                                           */}
        {/* ================================================================= */}
        {activeTab === 'terms' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div
              className="nexis-card p-6 sm:p-8 rounded-2xl border flex flex-col gap-6"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex flex-col gap-1 pb-4 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--primary)] font-bold">
                  TERMS OF SERVICE AGREEMENT
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-[var(--on-surface)]">
                  Terms of Use &amp; Acceptable Diagnostic Activity
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)]">
                  Please review the terms governing the use of the NEXIS Telemetry, Speed &amp; GIS Network Intelligence Platform.
                </p>
              </div>

              <section className="flex flex-col gap-2.5">
                <h3 className="text-base font-bold font-sans text-[var(--on-surface)]">
                  1. Acceptance of Terms
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  By accessing or utilizing NEXIS (via web browser, progressive web application, or API integration), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must refrain from running active network benchmarks.
                </p>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-base font-bold font-sans text-[var(--on-surface)]">
                  2. Acceptable Network Probing &amp; Permitted Use
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  NEXIS provides active and passive network diagnostics, including TCP throughput saturation, bufferbloat assessment, ICMP/WebSocket ping measurement, Wi-Fi channel spectrum analysis, and local subnet ARP scanning.
                </p>
                <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/10 text-xs text-[var(--on-surface)] flex flex-col gap-2">
                  <span className="font-bold text-amber-400">Strictly Prohibited Activities:</span>
                  <ul className="list-disc pl-5 space-y-1 text-[var(--on-surface-muted)]">
                    <li>Running continuous volumetric stress tests designed to cause Denial of Service (DoS) to third-party networks or anycast servers.</li>
                    <li>Port-scanning subnets or target IP ranges for which you do not possess explicit administrative authorization.</li>
                    <li>Submitting fraudulent, synthesized, or maliciously poisoned RF cell signal benchmarks to the crowdsourced database.</li>
                    <li>Attempting to reverse-engineer, de-anonymize, or correlate private residences from crowdsourced S2 spatial cells.</li>
                  </ul>
                </div>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-base font-bold font-sans text-[var(--on-surface)]">
                  3. Carrier SLA Disclaimers &amp; Benchmark Accuracy
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  NEXIS measurements are calculated utilizing RFC 6349 TCP throughput protocols, Web Workers, and multi-stream HTTP chunk streaming. However, real-world network throughput is subject to:
                </p>
                <ul className="list-disc pl-5 text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] space-y-1">
                  <li>Client hardware limits (Wi-Fi chipset capability, CPU thermal throttling, browser JS runtime limits).</li>
                  <li>Local radio propagation constraints (RSRP, physical walls, co-channel Wi-Fi interference).</li>
                  <li>Carrier transport congestion and dynamic subscriber throttling.</li>
                </ul>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] mt-1">
                  NEXIS diagnostics are provided on an <strong>"as-is" and "as-available" basis</strong>. While suitable for diagnostic analysis, NEXIS does not guarantee that ISP SLA disputes will be legally resolved based solely on browser-rendered test figures.
                </p>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-base font-bold font-sans text-[var(--on-surface)]">
                  4. Intellectual Property &amp; Community Contributions
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  The NEXIS design system, custom UI components, vector icons, and algorithmic implementations are protected by copyright. When you submit anonymized crowdsourced telemetry, you grant NEXIS a perpetual, royalty-free, worldwide license to aggregate, analyze, and publish collective coverage matrices for public community benefit.
                </p>
              </section>

              <section className="flex flex-col gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-base font-bold font-sans text-[var(--on-surface)]">
                  5. Limitation of Liability
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)] leading-relaxed">
                  In no event shall the authors, maintainers, or hosting contributors of NEXIS be liable for any direct, indirect, incidental, or consequential damages resulting from network bandwidth consumption, metered cellular data charges incurred during saturation testing, or downtime resulting from diagnostic probes.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: TELEMETRY & DIFFERENTIAL PRIVACY                           */}
        {/* ================================================================= */}
        {activeTab === 'telemetry' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div
              className="nexis-card p-6 sm:p-8 rounded-2xl border flex flex-col gap-6"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex flex-col gap-1 pb-4 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--primary)] font-bold">
                  CRYPTOGRAPHIC ARCHITECTURE SPECIFICATION
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-[var(--on-surface)]">
                  Differential Privacy &amp; Spatial Anonymization Engine
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)]">
                  How NEXIS mathematically protects user locations and network identities during crowdsourced cellular mapping.
                </p>
              </div>

              {/* 3-Pillar Architecture Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-mono font-bold text-xs">
                      1
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      Google S2 Level 13 Quantization
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    Raw latitude and longitude are mapped to a 64-bit Hilbert space-filling curve. Instead of saving <code className="text-[11px] font-mono">6.9271° N, 79.8612° E</code>, coordinates are projected to polygon cell <code className="text-[11px] font-mono text-[var(--primary)]">0x3ae259</code> with an average cell diameter of ~1,200 meters.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                      2
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      Subnet Host Zeroing
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    IP addresses are masked prior to disk write or network dispatch. For IPv4, the final octet is zeroed (<code className="text-[11px] font-mono">192.0.2.0/24</code>); for IPv6, the entire 64-bit interface identifier is stripped (<code className="text-[11px] font-mono">2001:db8::/64</code>).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono font-bold text-xs">
                      3
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      Home Geofence Exclusion
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    Users can define a private circular geofence radius (e.g., 200m around residence). Whenever an active measurement falls within this circle, crowdsourcing is automatically inhibited locally before any network packet is dispatched.
                  </p>
                </div>
              </div>

              {/* Mathematical Proof Box */}
              <div
                className="p-5 rounded-2xl border flex flex-col gap-3 font-mono text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 80%, transparent)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-dim)] border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--primary)] font-bold">// CROWDSOURCING POSTGIS MATERIALIZED VIEW AGGREGATE</span>
                  <span>SQL PostGIS v3.4</span>
                </div>
                <pre className="text-[11px] text-[var(--on-surface)] overflow-x-auto whitespace-pre leading-relaxed">
{`CREATE MATERIALIZED VIEW public.mv_coverage_grid AS
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
HAVING COUNT(DISTINCT device_id) >= 2; -- Mathematical k-Anonymity Guardrail`}
                </pre>
                <p className="text-[11px] font-sans text-[var(--on-surface-muted)] pt-1">
                  The <code className="text-[11px] font-mono text-[var(--primary)]">HAVING COUNT(DISTINCT device_id) &gt;= 2</code> clause guarantees that no single probe contributor can ever be isolated or singled out in public coverage queries.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: COOKIE & LOCAL STORAGE NOTICE                             */}
        {/* ================================================================= */}
        {activeTab === 'cookies' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div
              className="nexis-card p-6 sm:p-8 rounded-2xl border flex flex-col gap-6"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex flex-col gap-1 pb-4 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--primary)] font-bold">
                  TRANSPARENCY AUDIT
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-[var(--on-surface)]">
                  Browser Storage &amp; Cookie Disclosure
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)]">
                  Complete declaration of all client-side storage keys utilized by the NEXIS application.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-xs font-sans text-[var(--on-surface)] flex items-center gap-3">
                <CheckCircleRounded sx={{ fontSize: 20, color: 'var(--color-success)' }} />
                <span>
                  <strong>Zero Third-Party Advertising Cookies:</strong> NEXIS does not use Google Analytics, Meta Pixel, tracking pixels, or third-party fingerprinting cookies.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--on-surface-dim)] font-mono uppercase text-[10px]">
                      <th className="py-2.5 pr-4">Storage Key</th>
                      <th className="py-2.5 pr-4">Mechanism</th>
                      <th className="py-2.5 pr-4">Purpose</th>
                      <th className="py-2.5">Lifespan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis_telemetry_db
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">IndexedDB (Dexie)</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        Historical speed test runs, latency samples, bufferbloat logs, and carrier tags.
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Until cleared by user</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis-theme
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">localStorage</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        Stores UI theme preference ('dark' or 'light').
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Persistent</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis-ephemeral-probe-id
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">localStorage</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        Pseudonymous random token used to correlate multi-sample diagnostic runs without personal IDs.
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Until rotated</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis-opencellid-token
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">localStorage</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        User's private OpenCelliD API key for real tower lookups (never leaves browser).
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Until removed</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis-crowdsource-telemetry
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">localStorage</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        Boolean flag indicating whether to contribute anonymized benchmarks to coverage grid.
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Persistent</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis-coordinate-fuzzing
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">localStorage</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        Flag controlling S2 Level 13 polygonal cell quantization.
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Persistent</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-mono font-bold text-[var(--primary)]">
                        nexis_sidebar_collapsed
                      </td>
                      <td className="py-3 pr-4 text-[var(--on-surface-muted)]">localStorage</td>
                      <td className="py-3 pr-4 text-[var(--on-surface)]">
                        Persists whether the sidebar navigation is collapsed or expanded.
                      </td>
                      <td className="py-3 text-[var(--on-surface-muted)]">Persistent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: METHODOLOGY & RFC COMPLIANCE                               */}
        {/* ================================================================= */}
        {activeTab === 'methodology' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div
              className="nexis-card p-6 sm:p-8 rounded-2xl border flex flex-col gap-6"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex flex-col gap-1 pb-4 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--primary)] font-bold">
                  TELECOMMUNICATIONS BENCHMARK STANDARDS
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-[var(--on-surface)]">
                  Scientific Methodology &amp; RFC Standards
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[var(--on-surface-muted)]">
                  How NEXIS mathematically measures TCP throughput, bufferbloat, jitter, and quality of experience.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RFC 6349 */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] font-mono text-[10px] font-bold">
                      RFC 6349
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      TCP Throughput &amp; Window Saturation
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    Throughput is measured using multi-threaded chunk saturation. Probes discard the initial slow-start ramp-up window (0.8s) and compute the 90th percentile sliding sustained bitrate over 8.0s duration.
                  </p>
                </div>

                {/* Bufferbloat */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-mono text-[10px] font-bold">
                      BUFFERBLOAT
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      Loaded vs. Idle Latency Delta
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    Measures the queue latency explosion induced in network CPE routers during saturated downloads and uploads. Graded from <code className="text-[11px] font-mono text-[var(--color-success)]">A+ (&Delta; &lt; 5ms)</code> down to <code className="text-[11px] font-mono text-[var(--color-danger)]">F (&Delta; &gt; 150ms)</code>.
                  </p>
                </div>

                {/* RFC 3550 */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 font-mono text-[10px] font-bold">
                      RFC 3550
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      Statistical Interarrival Jitter
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    Computed via recursive first-order low-pass filter: <code className="text-[11px] font-mono">J(i) = J(i-1) + (|D(i-1, i)| - J(i-1)) / 16</code>, matching the RTP protocol standard for voice and streaming jitter evaluation.
                  </p>
                </div>

                {/* ITU-T QoE */}
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-mono text-[10px] font-bold">
                      ITU-T G.107
                    </span>
                    <h4 className="text-xs font-bold font-sans text-[var(--on-surface)]">
                      Quality of Experience (QoE) Scoring
                    </h4>
                  </div>
                  <p className="text-xs font-sans text-[var(--on-surface-muted)] leading-relaxed">
                    Composite multi-attribute utility function scoring application readiness across 4K UHD streaming, ultra-low latency cloud gaming, and crystal-clear bidirectional video conferencing.
                  </p>
                </div>
              </div>

              {/* QoE Grading Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--on-surface-dim)] font-mono uppercase text-[10px]">
                      <th className="py-2.5 pr-4">Application Tier</th>
                      <th className="py-2.5 pr-4">Required Throughput</th>
                      <th className="py-2.5 pr-4">Max Permissible Latency</th>
                      <th className="py-2.5">Max Packet Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">Cloud Gaming &amp; VR</td>
                      <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">&ge; 25 Mbps</td>
                      <td className="py-2.5 pr-4 text-[var(--color-success)] font-mono font-bold">&lt; 45 ms (Jitter &lt; 12ms)</td>
                      <td className="py-2.5 text-[var(--color-success)] font-mono">0.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">4K UHD Video Streaming</td>
                      <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">&ge; 25 Mbps</td>
                      <td className="py-2.5 pr-4 text-[var(--on-surface-muted)] font-mono">&lt; 120 ms</td>
                      <td className="py-2.5 text-[var(--on-surface-muted)] font-mono">&lt; 2.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-[var(--on-surface)]">HD Video Conferencing</td>
                      <td className="py-2.5 pr-4 text-[var(--on-surface-muted)]">&ge; 5 Mbps</td>
                      <td className="py-2.5 pr-4 text-[var(--on-surface-muted)] font-mono">&lt; 100 ms (Jitter &lt; 25ms)</td>
                      <td className="py-2.5 text-[var(--on-surface-muted)] font-mono">&lt; 1.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Contact & Docs Link ───────────────────────────────────── */}
      <div
        className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 mt-2"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/15 text-[var(--primary)] shrink-0">
            <MenuBookRounded sx={{ fontSize: 20 }} />
          </div>
          <div>
            <h4 className="text-sm font-bold font-sans text-[var(--on-surface)]">
              Need technical documentation?
            </h4>
            <p className="text-xs font-sans text-[var(--on-surface-muted)]">
              Explore our architecture guides, REST API specs, and network probe documentation.
            </p>
          </div>
        </div>

        <Link
          to="/docs"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-sans font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all cursor-pointer shrink-0"
        >
          <span>View Documentation</span>
          <LaunchRounded sx={{ fontSize: 14 }} />
        </Link>
      </div>
    </div>
  )
}
export default LegalPage

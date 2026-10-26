export interface ToolItem {
  id: string
  title: string
  subtitle: string
  category: 'subnet' | 'rf' | 'spatial'
  badge: string
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'cyan'
  gradient: string
  iconName: string
  capabilities: string[]
  recommendedFor: string
  protocol: string
  defaultTarget?: string
}

export interface ProbeLogEntry {
  id: string
  timestamp: string
  toolId: string
  toolName: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  payload?: any
}

export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All Tools Hub', count: 15, description: 'Comprehensive diagnostic suite & hardware probes' },
  { id: 'subnet', label: 'Subnet & Security', count: 6, description: 'Internal LAN auditing, port probing, and perimeter routing' },
  { id: 'rf', label: 'Wi-Fi & RF Radio', count: 5, description: 'Spectrum congestion, 802.11 signal telemetry, and bufferbloat' },
  { id: 'spatial', label: 'Spatial Surveyor', count: 3, description: 'Campus walk tests, building structures, and cellular line-of-sight' },
] as const

export const ALL_TOOLS: ToolItem[] = [
  // ── Subnet & Security ───────────────────────────────────────
  {
    id: 'doctor',
    title: 'Automated Network Doctor',
    subtitle: 'Deep heuristic audit of gateway jitter, DNS responsiveness, packet drops & radio noise',
    category: 'subnet',
    badge: 'HEURISTIC AUDIT',
    badgeVariant: 'cyan',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
    iconName: 'HealingRounded',
    capabilities: ['Gateway Jitter', 'DNS Resolution', 'MTU Discovery', 'Packet Loss', 'Dual-Stack IPv6'],
    recommendedFor: 'Diagnosing sluggish connections, streaming stutter, and gaming lag',
    protocol: 'ICMP / UDP / HTTPS',
    defaultTarget: 'Local Gateway (192.168.1.1)',
  },
  {
    id: 'public-ip',
    title: 'Public IP & WAN Inspector',
    subtitle: 'Check external WAN IP, ISP organization, Autonomous System (ASN), geo-location & WebRTC leak status',
    category: 'subnet',
    badge: 'EXTERNAL WAN',
    badgeVariant: 'primary',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    iconName: 'PublicRounded',
    capabilities: ['Public IPv4/IPv6', 'BGP ASN Lookup', 'Geo-IP Coordinates', 'WebRTC Leak Check', 'Carrier Route'],
    recommendedFor: 'Verifying VPN protection, carrier routing anomalies, and public exposure',
    protocol: 'HTTPS / BGP',
  },
  {
    id: 'traceroute',
    title: 'Visual Multi-Hop Traceroute',
    subtitle: 'Inspect packet routing hops, isolate intermediate network latency & map BGP autonomous systems',
    category: 'subnet',
    badge: 'ICMP / AS PATH',
    badgeVariant: 'warning',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    iconName: 'AltRouteRounded',
    capabilities: ['Hop Isolation', 'Per-Hop RTT', 'AS Organization', 'Loss Detection', 'Packet Path Graph'],
    recommendedFor: 'Pinpointing where latency spikes between your router and the destination',
    protocol: 'ICMP / UDP',
    defaultTarget: '1.1.1.1 (Cloudflare DNS)',
  },
  {
    id: 'port-scanner',
    title: 'Port & Security Scanner',
    subtitle: 'Probe common open ports (HTTP, SSH, RTSP, SMB, DNS, RDP) and assess network attack surface',
    category: 'subnet',
    badge: 'SECURITY AUDIT',
    badgeVariant: 'danger',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    iconName: 'SecurityRounded',
    capabilities: ['TCP Handshake Probe', 'Service Identification', 'Vulnerability Assessment', 'Firewall Inspection'],
    recommendedFor: 'Verifying firewall rules and detecting exposed services or IoT devices',
    protocol: 'TCP SYN / ACK',
    defaultTarget: '192.168.1.1',
  },
  {
    id: 'lan-scanner',
    title: 'LAN Device & Intruder Discovery',
    subtitle: 'Scan subnet to discover connected phones, laptops, smart TVs, cameras & unauthorized guests',
    category: 'subnet',
    badge: 'ARP / SUBNET',
    badgeVariant: 'success',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    iconName: 'DevicesRounded',
    capabilities: ['Subnet Sweep', 'MAC OUI Vendor Lookup', 'Host Device Type', 'IP Conflict Check'],
    recommendedFor: 'Inventorying home or office devices and spotting unauthorized Wi-Fi users',
    protocol: 'ARP / mDNS',
    defaultTarget: '192.168.1.0/24',
  },
  {
    id: 'dns-benchmark',
    title: 'DNS Resolver Benchmark & Leak Auditor',
    subtitle: 'Compare query times across Cloudflare, Google, Quad9, OpenDNS & local ISP resolvers',
    category: 'subnet',
    badge: 'DNS RESOLUTION',
    badgeVariant: 'purple',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    iconName: 'DnsRounded',
    capabilities: ['Multi-Resolver Race', 'DNSSEC Validation', 'Cache Poisoning Test', 'Fastest Resolver Pick'],
    recommendedFor: 'Selecting the fastest and most private DNS provider for your connection',
    protocol: 'DoH / UDP 53',
    defaultTarget: 'Cloudflare / Google / Quad9',
  },
  {
    id: 'wol',
    title: 'Wake-on-LAN (WoL) Controller',
    subtitle: 'Broadcast UDP magic packets to wake sleeping PCs, NAS appliances, workstations and media servers',
    category: 'subnet',
    badge: 'ETHERNET WOL',
    badgeVariant: 'warning',
    gradient: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
    iconName: 'PowerSettingsNewRounded',
    capabilities: ['Magic Packet Dispatch', 'Broadcast 255.255.255.255', 'Port 7/9 Support', 'MAC Verification'],
    recommendedFor: 'Remotely powering on desktop rigs or home lab servers from sleep states',
    protocol: 'UDP Broadcast',
    defaultTarget: 'FF:FF:FF:FF:FF:FF',
  },

  // ── Wi-Fi & RF Radio ───────────────────────────────────────
  {
    id: 'speed-diagnostic',
    title: 'Calibrated Speed & Bufferbloat Diagnostic',
    subtitle: 'Strict budget benchmark verifying unloaded vs loaded latency, packet jitter, and throughput',
    category: 'rf',
    badge: 'QOS / BUFFERBLOAT',
    badgeVariant: 'cyan',
    gradient: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
    iconName: 'SpeedRounded',
    capabilities: ['Throughput Benchmark', 'Bufferbloat Grade A-F', 'Jitter Deviation', 'Loaded Latency'],
    recommendedFor: 'Testing if video calls or games freeze while others download in the background',
    protocol: 'WebSocket / HTTP Stream',
  },
  {
    id: 'wifi-analyzer',
    title: 'Wi-Fi Spectrum & Channel Analyzer',
    subtitle: '2.4 GHz vs 5 GHz channel congestion scoring, channel width overlap & co-channel interference',
    category: 'rf',
    badge: 'RF SPECTRUM',
    badgeVariant: 'cyan',
    gradient: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
    iconName: 'WifiRounded',
    capabilities: ['Channel Congestion 1-14', '5 GHz UNII Radar', 'Width (20/40/80/160 MHz)', 'Channel Recommendation'],
    recommendedFor: 'Finding the clearest Wi-Fi channel with zero neighbour interference',
    protocol: '802.11 Beacon Frame',
    defaultTarget: 'Channel 1, 6, 11 (2.4 GHz) / 36-161 (5 GHz)',
  },
  {
    id: 'router-mapper',
    title: 'Router Signal & RSSI Heatmap Mapper',
    subtitle: 'Live dBm signal meter, signal-to-noise ratio (SNR), and room-by-room radio attenuation mapping',
    category: 'rf',
    badge: '802.11 RADIO',
    badgeVariant: 'purple',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
    iconName: 'RouterRounded',
    capabilities: ['Live RSSI (dBm)', 'Signal-to-Noise Ratio', 'Link Budget Estimation', 'Dead Zone Logging'],
    recommendedFor: 'Locating Wi-Fi dead spots in large houses or office rooms',
    protocol: 'RSSI / SNR Metric',
  },
  {
    id: 'ping-monitor',
    title: 'Gateway Ping & Jitter Realtime Stream',
    subtitle: 'Continuous microsecond ping graph to gateway router with packet drop counter & deviation analysis',
    category: 'rf',
    badge: 'ICMP MONITOR',
    badgeVariant: 'primary',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    iconName: 'NetworkCheckRounded',
    capabilities: ['Continuous Ping Stream', 'Rolling Latency Graph', 'Micro-drop Alerting', 'Jitter Standard Deviation'],
    recommendedFor: 'Detecting intermittent Wi-Fi drops, packet spikes, and microwave interference',
    protocol: 'ICMP Echo',
    defaultTarget: 'Gateway Router (192.168.1.1)',
  },
  {
    id: 'environmental-predictor',
    title: 'Environmental & RF Context Simulator',
    subtitle: 'Simulate speed impact of distance, wall materials, weather rain fade & peak-hour congestion',
    category: 'rf',
    badge: 'PHYSICS & ML',
    badgeVariant: 'cyan',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    iconName: 'TuneRounded',
    capabilities: ['Path Loss (FSPL)', 'Wall Attenuation (dB)', 'Diurnal Congestion Curve', 'Weather Rain Fade', 'Bottleneck Root-Cause'],
    recommendedFor: 'Predicting expected speeds and diagnosing why your speed drops with distance or walls',
    protocol: 'FastAPI / ITU-R P.838',
  },

  // ── Spatial Surveyor ───────────────────────────────────────
  {
    id: 'walk-map',
    title: 'Walk & Map (Campus Surveyor)',
    subtitle: 'Continuous walk test: detect AP handovers, roaming gaps, dead zones & link directly into GIS Map',
    category: 'spatial',
    badge: 'GIS / ROAMING',
    badgeVariant: 'primary',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    iconName: 'DirectionsWalkRounded',
    capabilities: ['BSSID Roaming Detection', 'GPS Waypoint Stamping', 'Dead Zone Polygon Export', 'GIS Map Sync'],
    recommendedFor: 'Surveying office floors, universities, or warehouses during active movement',
    protocol: 'S2 Spatial / 802.11k/v/r',
  },
  {
    id: 'venue-builder',
    title: 'Venue & Campus Structure Builder',
    subtitle: 'Digitally structure buildings, multi-level floors, rooms, access point deployments & attenuation walls',
    category: 'spatial',
    badge: 'SPATIAL CAD',
    badgeVariant: 'purple',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    iconName: 'DomainRounded',
    capabilities: ['Multi-Floor Hierarchy', 'AP Placement Grid', 'Wall Attenuation Modeling', 'GeoJSON CAD Export'],
    recommendedFor: 'Planning enterprise network deployments and access point density',
    protocol: 'CAD / GeoJSON Vector',
  },
  {
    id: 'tower-los',
    title: 'Cellular Tower Line-of-Sight & Fresnel Zone',
    subtitle: 'Calculate line-of-sight clearance, azimuth bearing, and 1st Fresnel zone diffraction to nearest cell mast',
    category: 'spatial',
    badge: 'CELLULAR RF',
    badgeVariant: 'cyan',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    iconName: 'SensorsRounded',
    capabilities: ['Fresnel Zone Clearance', 'Azimuth Bearing (0-360°)', 'Tower Haversine Distance', 'Elevation Profiling'],
    recommendedFor: 'Aiming 4G/5G directional external antennas and optimizing fixed wireless links',
    protocol: 'RF Propagation 3GPP',
  },
]

// Diagnostic presets and mock simulations
export const MOCK_TRACEROUTE_HOPS = [
  { hop: 1, ip: '192.168.1.1', host: 'gateway.local', as: 'Local LAN', location: 'Home Router', rtt: 1.2, jitter: 0.3, loss: 0 },
  { hop: 2, ip: '10.144.0.1', host: 'edge-gw.isp.net', as: 'ISP Private Subnet', location: 'Metropolitan Aggregator', rtt: 6.8, jitter: 1.1, loss: 0 },
  { hop: 3, ip: '198.51.100.25', host: 'col-core01.isp.net', as: 'AS9329 SLT Broadband', location: 'Colombo Central IXP', rtt: 11.4, jitter: 1.8, loss: 0 },
  { hop: 4, ip: '182.79.222.14', host: 'airtel-sea-me-we5.in', as: 'AS9498 BHARTI-AIRTEL', location: 'Undersea Cable Landing (SMW5)', rtt: 24.3, jitter: 2.4, loss: 0 },
  { hop: 5, ip: '195.66.226.77', host: 'linx-cloudflare.net', as: 'AS13335 Cloudflare, Inc.', location: 'Equinix SG1 Datacenter (Singapore)', rtt: 38.6, jitter: 1.5, loss: 0 },
  { hop: 6, ip: '1.1.1.1', host: 'one.one.one.one', as: 'AS13335 Cloudflare Global Anycast', location: 'Edge Cache Node', rtt: 39.2, jitter: 0.8, loss: 0 },
]

export const MOCK_LAN_DEVICES = [
  { ip: '192.168.1.1', mac: 'F4:8E:38:12:AA:01', vendor: 'TP-Link Corporation', name: 'Primary Wi-Fi 6 Gateway', type: 'Gateway', status: 'Online', latency: '1.1 ms', isIntruder: false },
  { ip: '192.168.1.10', mac: '3C:06:30:8F:B2:44', vendor: 'Apple Inc.', name: 'MacBook Pro 16" (M3 Max)', type: 'Workstation', status: 'Active (Current)', latency: '0.4 ms', isIntruder: false },
  { ip: '192.168.1.14', mac: 'DC:A6:32:4A:11:89', vendor: 'Raspberry Pi Trading', name: 'Home Assistant / Pi-hole', type: 'Server', status: 'Online', latency: '2.3 ms', isIntruder: false },
  { ip: '192.168.1.22', mac: '70:EC:E4:71:02:18', vendor: 'Sony Interactive Ent.', name: 'PlayStation 5 Console', type: 'Gaming Console', status: 'Standby', latency: '4.8 ms', isIntruder: false },
  { ip: '192.168.1.45', mac: 'B8:27:EB:D3:55:76', vendor: 'LG Electronics', name: 'LG OLED C3 Smart TV', type: 'Smart TV', status: 'Online', latency: '6.1 ms', isIntruder: false },
  { ip: '192.168.1.109', mac: '94:E6:86:23:44:09', vendor: 'Espressif Inc.', name: 'Smart Ambient Bulb (Living Room)', type: 'IoT Device', status: 'Online', latency: '12.4 ms', isIntruder: false },
  { ip: '192.168.1.218', mac: '00:1E:C2:9B:41:A7', vendor: 'Unknown OUI (Unregistered)', name: 'Android Generic Probe (Suspicious)', type: 'Unknown Guest', status: 'Active', latency: '42.1 ms', isIntruder: true },
]

export const MOCK_PORT_SCAN_RESULTS = [
  { port: 80, proto: 'TCP', service: 'HTTP', state: 'Open', risk: 'Medium', info: 'Web administration portal active (Lighttpd 1.4)' },
  { port: 443, proto: 'TCP', service: 'HTTPS', state: 'Open', risk: 'Low', info: 'TLS 1.3 encrypted portal active (Self-signed certificate)' },
  { port: 22, proto: 'TCP', service: 'SSH', state: 'Open', risk: 'Low', info: 'OpenSSH 9.2p1 router shell (Key-based auth)' },
  { port: 53, proto: 'UDP/TCP', service: 'DNS', state: 'Open', risk: 'Low', info: 'Dnsmasq 2.89 caching resolver' },
  { port: 554, proto: 'TCP', service: 'RTSP', state: 'Filtered', risk: 'Medium', info: 'RTSP video stream service protected by firewall' },
  { port: 445, proto: 'TCP', service: 'SMB', state: 'Closed', risk: 'Low', info: 'Direct SMB Windows file sharing port closed' },
  { port: 3389, proto: 'TCP', service: 'RDP', state: 'Closed', risk: 'Low', info: 'Remote Desktop Protocol port closed' },
  { port: 8080, proto: 'TCP', service: 'HTTP-Proxy', state: 'Open', risk: 'High', info: 'Secondary management web interface accessible without TLS' },
]

export const MOCK_DNS_RESOLVERS = [
  { id: 'cf', name: 'Cloudflare', primaryIp: '1.1.1.1', secondaryIp: '1.0.0.1', latency: 11, dnssec: true, anycast: true, privacy: 'Strict Zero-Log' },
  { id: 'google', name: 'Google Public DNS', primaryIp: '8.8.8.8', secondaryIp: '8.8.4.4', latency: 17, dnssec: true, anycast: true, privacy: 'Standard' },
  { id: 'quad9', name: 'Quad9 Security', primaryIp: '9.9.9.9', secondaryIp: '149.112.112.112', latency: 22, dnssec: true, anycast: true, privacy: 'Malware Blocking' },
  { id: 'opendns', name: 'Cisco OpenDNS', primaryIp: '208.67.222.222', secondaryIp: '208.67.220.220', latency: 29, dnssec: true, anycast: true, privacy: 'Configurable' },
  { id: 'isp', name: 'Local ISP Gateway', primaryIp: '192.168.1.1', secondaryIp: 'ISP DNS', latency: 14, dnssec: false, anycast: false, privacy: 'ISP Intercepted' },
]

export const MOCK_WIFI_CHANNELS = [
  { channel: 1, freq: '2412 MHz', band: '2.4 GHz', utilization: 82, rating: 'Congested', networks: 8, overlap: 'Overlaps with 2, 3' },
  { channel: 6, freq: '2437 MHz', band: '2.4 GHz', utilization: 64, rating: 'Moderate', networks: 5, overlap: 'Overlaps with 4, 5, 7, 8' },
  { channel: 11, freq: '2462 MHz', band: '2.4 GHz', utilization: 38, rating: 'Optimal', networks: 2, overlap: 'Overlaps with 9, 10' },
  { channel: 36, freq: '5180 MHz', band: '5 GHz', utilization: 14, rating: 'Pristine', networks: 1, overlap: 'Zero co-channel overlap' },
  { channel: 44, freq: '5220 MHz', band: '5 GHz', utilization: 18, rating: 'Pristine', networks: 1, overlap: 'Zero co-channel overlap' },
  { channel: 149, freq: '5745 MHz', band: '5 GHz', utilization: 25, rating: 'Clean', networks: 2, overlap: 'Zero co-channel overlap' },
]

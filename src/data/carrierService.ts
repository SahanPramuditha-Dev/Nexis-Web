/**
 * NEXIS Carrier & ISP Identification Service
 * Accurately detects and classifies real telecommunication carriers, ISPs, and ASNs worldwide.
 */

import { dedupePromise } from './dedupe'

export interface CarrierIdentity {
  ip: string
  isp: string
  asn: number | null
  org: string
  city: string
  region: string
  country: string
  countryCode: string
  connectionType: 'Fiber' | 'Wi-Fi' | 'Cellular' | 'Broadband'
}

let cachedCarrier: CarrierIdentity | null = null

/** Normalize common carrier names for clean display across UI cards */
export function cleanCarrierName(rawName: string): string {
  if (!rawName) return 'Broadband Provider'
  const trimmed = rawName.trim()

  // Sri Lanka
  if (/Sri Lanka Telecom|SLT|Mobitel/i.test(trimmed)) return 'SLT-Mobitel'
  if (/Dialog Axiata|Dialog Broadband/i.test(trimmed)) return 'Dialog Axiata'
  if (/Airtel Lanka|Bharti Airtel/i.test(trimmed)) return 'Airtel Lanka'
  if (/Hutchison|Hutch Telecom/i.test(trimmed)) return 'Hutch Lanka'

  // United States
  if (/Comcast|Xfinity/i.test(trimmed)) return 'Comcast Xfinity'
  if (/Charter|Spectrum/i.test(trimmed)) return 'Charter Spectrum'
  if (/Verizon/i.test(trimmed)) return 'Verizon'
  if (/AT&T|SBC/i.test(trimmed)) return 'AT&T'
  if (/T-Mobile|Sprint/i.test(trimmed)) return 'T-Mobile'

  // Singapore
  if (/Singtel/i.test(trimmed)) return 'Singtel'
  if (/StarHub/i.test(trimmed)) return 'StarHub'
  if (/M1 Limited|M1/i.test(trimmed)) return 'M1'

  // UK & Europe
  if (/British Telecom|BT Group/i.test(trimmed)) return 'BT'
  if (/Vodafone/i.test(trimmed)) return 'Vodafone'
  if (/EE Limited|EE/i.test(trimmed)) return 'EE'
  if (/Virgin Media/i.test(trimmed)) return 'Virgin Media'
  if (/Deutsche Telekom|Telekom Deutschland/i.test(trimmed)) return 'Deutsche Telekom'

  // Strip corporate clutter like "PLC", "Ltd.", "Inc.", "LLC"
  return trimmed
    .replace(/,\s*(Inc\.|LLC|Ltd\.|PLC|Corp\.|Corporation|Company)$/i, '')
    .replace(/\s+(Limited|Corporation|Company)$/i, '')
    .trim()
}

/** Infer genuine technology classification, replacing buggy browser 3g tags */
export function inferConnectionType(
  ispName: string,
  orgName?: string,
  downloadSpeed?: number | null,
  asn?: number | null
): 'Fiber' | 'Wi-Fi' | 'Cellular' | 'Broadband' {
  const combined = `${ispName} ${orgName || ''}`.toLowerCase()

  // ASN-specific routing:
  // AS9329: Sri Lanka Telecom PLC (Fixed line / FTTH / ADSL / PeoTV) -> Primary Fiber & FTTH network in SL
  // AS45489: Mobitel (Pvt) Ltd -> Cellular / LTE / 5G
  if (asn === 9329 || /sri lanka telecom|slt-mobitel.*as9329/i.test(combined)) {
    return 'Fiber'
  }
  if (asn === 45489 || (/mobitel/i.test(combined) && !/sri lanka telecom/i.test(combined))) {
    return 'Cellular'
  }

  // Fiber flags
  if (/fiber|fibre|gpon|ftth|optical|gigabit/i.test(combined)) {
    return 'Fiber'
  }

  // Cellular flags
  if (/cellular|mobile|gsm|lte|5g|wireless|hutch|airtel/i.test(combined) && !/fiber|adsl|vdsl|broadband/i.test(combined)) {
    return 'Cellular'
  }

  // High speed threshold indicates fiber/gigabit broadband
  if (downloadSpeed && downloadSpeed >= 70) {
    return 'Fiber'
  }

  // Sri Lanka Telecom fixed broadband without mobile flag is Fiber/FTTH
  if (/sri lanka telecom/i.test(combined) || ispName === 'SLT-Mobitel') {
    return 'Fiber'
  }

  return 'Broadband'
}

/** Detect client's true ISP/Carrier and ASN using resilient multi-tier WHOIS */
export async function detectClientCarrier(): Promise<CarrierIdentity> {
  if (cachedCarrier) return cachedCarrier

  // Check sessionStorage
  try {
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('nexis_carrier_identity') : null
    if (stored) {
      cachedCarrier = JSON.parse(stored)
      return cachedCarrier!
    }
  } catch {}

  return dedupePromise('detectClientCarrier', async () => {
    // Primary Provider: ipwho.is (zero key required, fast ASN & ISP extraction)
    try {
      const res = await fetch('https://ipwho.is/', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          const rawIsp = data.connection?.isp || data.connection?.org || 'Broadband Provider'
          const ispName = cleanCarrierName(rawIsp)
          const parsedAsn = data.connection?.asn ? Number(data.connection.asn) : null
          const identity: CarrierIdentity = {
            ip: data.ip || '127.0.0.1',
            isp: ispName,
            asn: parsedAsn,
            org: data.connection?.org || '',
            city: data.city || '',
            region: data.region || '',
            country: data.country || '',
            countryCode: data.country_code || '',
            connectionType: inferConnectionType(ispName, data.connection?.org, null, parsedAsn),
          }
          cachedCarrier = identity
          try {
            sessionStorage.setItem('nexis_carrier_identity', JSON.stringify(identity))
          } catch {}
          return identity
        }
      }
    } catch {}

    // Fallback Provider: ipapi.co
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const rawIsp = data.org || data.asn || 'Broadband Provider'
        const ispName = cleanCarrierName(rawIsp)
        const parsedAsn = data.asn ? parseInt(String(data.asn).replace(/\D/g, ''), 10) : null
        const identity: CarrierIdentity = {
          ip: data.ip || '127.0.0.1',
          isp: ispName,
          asn: isNaN(parsedAsn!) ? null : parsedAsn,
          org: data.org || '',
          city: data.city || '',
          region: data.region || '',
          country: data.country_name || '',
          countryCode: data.country_code || '',
          connectionType: inferConnectionType(ispName, data.org, null, parsedAsn),
        }
        cachedCarrier = identity
        try {
          sessionStorage.setItem('nexis_carrier_identity', JSON.stringify(identity))
        } catch {}
        return identity
      }
    } catch {}

    // Default Fallback
    const fallback: CarrierIdentity = {
      ip: '127.0.0.1',
      isp: 'Local ISP / Gateway',
      asn: null,
      org: '',
      city: '',
      region: '',
      country: '',
      countryCode: '',
      connectionType: 'Broadband',
    }
    return fallback
  })
}

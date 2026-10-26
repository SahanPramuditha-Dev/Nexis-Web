/**
 * NEXIS Offline Map & Asset Service Worker
 * Intercepts and caches raster map tiles and static assets using CacheFirst strategy.
 * Operates entirely within the browser's Cache API with ZERO remote database reads/writes.
 */

const CACHE_NAME = 'nexis-map-tiles-v1'
const MAX_CACHED_TILES = 1500

// Tile servers and pattern regexes
const TILE_DOMAINS = [
  'server.arcgisonline.com',
  'tile.openstreetmap.org',
  'basemaps.cartocdn.com',
  'opentopomap.org',
  'stamen.com',
]

function isMapTile(url) {
  try {
    const parsed = new URL(url)
    const isDomainMatch = TILE_DOMAINS.some((domain) => parsed.hostname.includes(domain))
    const isTilePath = /\/tile\/\d+\/\d+\/\d+/i.test(parsed.pathname) || /\/\d+\/\d+\/\d+\.png/i.test(parsed.pathname)
    return isDomainMatch || isTilePath
  } catch {
    return false
  }
}

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('nexis-map-tiles-')) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  // Only handle GET requests for tiles
  if (request.method !== 'GET') return

  if (isMapTile(request.url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. Check local cache first (0ms load, offline capable)
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          return cachedResponse
        }

        // 2. Fetch over network
        try {
          const networkResponse = await fetch(request)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            // Save a clone to cache
            cache.put(request, networkResponse.clone()).then(() => {
              pruneTileCache(cache)
            }).catch(() => {})
          }
          return networkResponse
        } catch (error) {
          // If offline and not in cache, fallback gracefully
          return cachedResponse || new Response('', { status: 408, statusText: 'Tile Offline' })
        }
      })
    )
  }
})

/**
 * Bounds the cache size to prevent unlimited disk growth
 */
async function pruneTileCache(cache) {
  try {
    const keys = await cache.keys()
    if (keys.length > MAX_CACHED_TILES) {
      const deleteCount = keys.length - MAX_CACHED_TILES
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i])
      }
    }
  } catch {}
}

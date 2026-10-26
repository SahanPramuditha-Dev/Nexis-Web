/**
 * NEXIS Request Deduplication & In-Memory Session Cache
 * Coalesces identical concurrent network requests into a single promise and provides
 * low-latency, zero-cost in-memory caching to eliminate duplicate API/DB read calls.
 */

interface CacheEntry<T> {
  data: T
  cachedAt: number
  expiresAt: number
}

// In-flight pending promises map
const inFlightRequests = new Map<string, Promise<unknown>>()

// Session-level memory cache
const memoryCache = new Map<string, CacheEntry<unknown>>()

/**
 * Deduplicate in-flight concurrent requests.
 * If a request with the same key is already in progress, returns the existing promise.
 */
export async function dedupePromise<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inFlightRequests.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = (async () => {
    try {
      return await fetcher()
    } finally {
      inFlightRequests.delete(key)
    }
  })()

  inFlightRequests.set(key, promise)
  return promise
}

/**
 * Fetches data with in-memory caching and request deduplication.
 * @param key Unique cache key
 * @param fetcher Async function to fetch data if not in cache
 * @param ttlMs Time-to-live in milliseconds (default: 5 minutes)
 */
export async function fetchWithSessionCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000
): Promise<T> {
  const now = Date.now()
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  return dedupePromise(key, async () => {
    // Re-check cache in case another coalesced request just populated it
    const freshCheck = memoryCache.get(key) as CacheEntry<T> | undefined
    if (freshCheck && freshCheck.expiresAt > Date.now()) {
      return freshCheck.data
    }

    const data = await fetcher()
    memoryCache.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    })

    // Prune old entries if memory cache exceeds 200 items
    if (memoryCache.size > 200) {
      pruneExpiredEntries()
    }

    return data
  })
}

/**
 * Invalidate a specific key or keys starting with a prefix.
 */
export function invalidateSessionCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear()
    return
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * Remove expired cache entries from memory.
 */
function pruneExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key)
    }
  }
}

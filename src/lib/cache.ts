/**
 * In-Memory Cache System for Supabase Data
 *
 * This cache stores all rate data from Supabase in memory for fast lookups
 * during premium calculations. Data is loaded once when the user clicks
 * "กดเพื่อเริ่มคำนวน" and reused throughout the calculation session.
 */

export type CacheData = {
  // Rider rates indexed by: ${age}|${gender}|${segcode}
  riderRates: Record<string, number | null>;
  // Regular policy rates indexed by: ${age}|${gender}|${segcode}
  regularRates: Record<string, number | null>;
  // Track which age range is cached for validation
  minAge: number;
  maxAge: number;
  // Timestamp for cache validity
  loadedAt: number;
};

/**
 * In-memory cache instance (server-side only)
 * This is NOT available in browser - data flows from server via session storage
 */
let cacheInstance: CacheData | null = null;

/**
 * Initialize cache with data from Supabase
 * Called once when user starts a new calculation session
 */
export function initializeCache(data: CacheData): void {
  cacheInstance = {
    ...data,
    loadedAt: Date.now(),
  };
  console.log("[CACHE] Initialized with age range", {
    minAge: data.minAge,
    maxAge: data.maxAge,
    riderRateCount: Object.keys(data.riderRates).length,
    regularRateCount: Object.keys(data.regularRates).length,
  });
}

/**
 * Get cached rider rate
 * Format: ${age}|${gender}|${segcode}
 */
export function getCachedRiderRate(
  age: number,
  gender: string,
  segcode: string
): number | null | undefined {
  if (!cacheInstance) return undefined;
  const key = `${age}|${gender.toLowerCase()}|${segcode}`;
  return cacheInstance.riderRates[key];
}

/**
 * Get cached regular (main policy) rate
 * Format: ${age}|${gender}|${segcode}
 */
export function getCachedRegularRate(
  age: number,
  gender: string,
  segcode: string
): number | null | undefined {
  if (!cacheInstance) return undefined;
  const key = `${age}|${gender.toLowerCase()}|${segcode}`;
  return cacheInstance.regularRates[key];
}

/**
 * Get all cached rider rates for a specific age range
 * Useful for validation and debugging
 */
export function getCachedRiderRatesByAge(
  age: number
): Record<string, number | null> {
  if (!cacheInstance) return {};

  const result: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(cacheInstance.riderRates)) {
    if (key.startsWith(`${age}|`)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Check if cache is available and valid
 */
export function isCacheAvailable(): boolean {
  return cacheInstance !== null;
}

/**
 * Get cache metadata
 */
export function getCacheMetadata() {
  if (!cacheInstance) return null;
  return {
    minAge: cacheInstance.minAge,
    maxAge: cacheInstance.maxAge,
    loadedAt: cacheInstance.loadedAt,
    loadedAgo: Date.now() - cacheInstance.loadedAt,
    riderRateCount: Object.keys(cacheInstance.riderRates).length,
    regularRateCount: Object.keys(cacheInstance.regularRates).length,
  };
}

/**
 * Clear cache (e.g., when starting a new session)
 */
export function clearCache(): void {
  cacheInstance = null;
  console.log("[CACHE] Cleared");
}

/**
 * Build cache from raw query results
 * This converts Supabase query results into the cache format
 */
export function buildRateratesCache(
  riderResults: Array<{
    age: number;
    gender: string;
    segcode: string;
    interest: number;
  }>,
  regularResults: Array<{
    age: number;
    gender: string;
    segcode: string;
    interest: number;
  }>,
  minAge: number,
  maxAge: number
): CacheData {
  const riderRates: Record<string, number | null> = {};
  const regularRates: Record<string, number | null> = {};

  // Build rider rates map
  for (const row of riderResults) {
    const key = `${row.age}|${row.gender.toLowerCase()}|${row.segcode}`;
    riderRates[key] = row.interest;
  }

  // Build regular rates map
  for (const row of regularResults) {
    const key = `${row.age}|${row.gender.toLowerCase()}|${row.segcode}`;
    regularRates[key] = row.interest;
  }

  return {
    riderRates,
    regularRates,
    minAge,
    maxAge,
    loadedAt: Date.now(),
  };
}

/**
 * Preload cache entries that will be needed
 * This ensures all rates are in cache before calculation starts
 */
export function ensureCacheHasRange(minAge: number, maxAge: number): boolean {
  if (!cacheInstance) {
    console.warn("[CACHE] Cache not initialized");
    return false;
  }

  const cacheOk =
    cacheInstance.minAge <= minAge && cacheInstance.maxAge >= maxAge;
  if (!cacheOk) {
    console.error("[CACHE] Age range not covered", {
      requested: { minAge, maxAge },
      cached: { minAge: cacheInstance.minAge, maxAge: cacheInstance.maxAge },
    });
  }
  return cacheOk;
}

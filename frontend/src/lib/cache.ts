/**
 * Client-Side API Cache
 *
 * Provides localStorage-backed caching for GET API responses.
 * - Keys: derived from the full request URL
 * - TTL: configurable per endpoint prefix (defaults to 2 minutes)
 * - Mutations automatically invalidate matching cache entries
 *
 * IMPORTANT: Only safe to run in the browser (SSR-safe guards included).
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'ems_cache:';

/**
 * TTL overrides keyed by URL prefix (matched in order, first match wins).
 * All values in milliseconds.
 */
const TTL_RULES: { prefix: string; ttl: number }[] = [
    // Real-time / frequently updated — short TTL
    { prefix: '/api/announcements', ttl: 60_000 },        // 1 minute
    { prefix: '/api/phases',        ttl: 60_000 },        // 1 minute
    { prefix: '/api/checkin',       ttl: 30_000 },        // 30 seconds

    // Judges workflow — medium TTL
    { prefix: '/api/judging/allocations', ttl: 2 * 60_000 }, // 2 minutes
    { prefix: '/api/judging/scores',      ttl: 2 * 60_000 }, // 2 minutes
    { prefix: '/api/judging/rankings',    ttl: 5 * 60_000 }, // 5 minutes
    { prefix: '/api/judging',             ttl: 5 * 60_000 }, // 5 minutes (rubrics, judges list)

    // Slow-changing reference data — long TTL
    { prefix: '/api/teams',     ttl: 5 * 60_000 },  // 5 minutes
    { prefix: '/api/mentors',   ttl: 5 * 60_000 },  // 5 minutes
    { prefix: '/api/sponsors',  ttl: 10 * 60_000 }, // 10 minutes
    { prefix: '/api/analytics', ttl: 3 * 60_000 },  // 3 minutes
    { prefix: '/api/admin',     ttl: 2 * 60_000 },  // 2 minutes
    { prefix: '/api/helpdesk',  ttl: 60_000 },      // 1 minute (tickets change)
];

const DEFAULT_TTL = 2 * 60_000; // 2 minutes fallback

// ─── Helpers ────────────────────────────────────────────────────────────────

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/** Extract just the pathname from a full URL or endpoint string. */
function getPath(url: string): string {
    if (url.startsWith('http')) {
        try { return new URL(url).pathname; } catch { /* fall through */ }
    }
    return url.split('?')[0];
}

function getTTL(url: string): number {
    const path = getPath(url);
    const rule = TTL_RULES.find((r) => path.startsWith(r.prefix));
    return rule?.ttl ?? DEFAULT_TTL;
}

function buildKey(url: string): string {
    return `${CACHE_PREFIX}${url}`;
}

// ─── Core Cache Operations ───────────────────────────────────────────────────

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
    cachedAt: number;
}

/**
 * Read a cache entry. Returns `null` on miss or if expired.
 */
export function cacheGet<T>(url: string): T | null {
    if (!isBrowser()) return null;
    try {
        const raw = localStorage.getItem(buildKey(url));
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(buildKey(url));
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Write a cache entry with the appropriate TTL for the given URL.
 */
export function cacheSet<T>(url: string, data: T): void {
    if (!isBrowser()) return;
    try {
        const ttl = getTTL(url);
        const entry: CacheEntry<T> = {
            data,
            expiresAt: Date.now() + ttl,
            cachedAt: Date.now(),
        };
        localStorage.setItem(buildKey(url), JSON.stringify(entry));
    } catch (e) {
        // localStorage can be full — fail silently
        console.warn('[cache] Failed to write cache entry:', e);
    }
}

/**
 * Invalidate all cache entries whose keys START WITH any of the given prefixes.
 * Call this after mutations (POST/PUT/PATCH/DELETE) so stale data is evicted.
 *
 * @example invalidateByPrefix(['/api/teams', '/api/admin'])
 */
export function invalidateByPrefix(prefixes: string[]): void {
    if (!isBrowser()) return;
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(CACHE_PREFIX)) continue;
        const storedUrl = key.slice(CACHE_PREFIX.length);
        // storedUrl is a full URL (e.g. http://localhost:8001/api/sponsors/tracks)
        // prefixes are path-only (e.g. /api/sponsors) — extract path before comparing
        const storedPath = getPath(storedUrl);
        if (prefixes.some((p) => storedPath.startsWith(p))) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((k) => localStorage.removeItem(k));
    if (keysToDelete.length > 0) {
        console.debug(`[cache] Invalidated ${keysToDelete.length} entries for prefixes:`, prefixes);
    } else {
        console.debug(`[cache] No entries matched for prefixes:`, prefixes);
    }
}

/**
 * Remove a single exact cache entry.
 */
export function invalidateExact(url: string): void {
    if (!isBrowser()) return;
    localStorage.removeItem(buildKey(url));
}

/**
 * Wipe the entire EMS cache from localStorage.
 * Useful after logout or when you want a full refresh.
 */
export function clearAllCache(): void {
    if (!isBrowser()) return;
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((k) => localStorage.removeItem(k));
    console.debug(`[cache] Cleared all ${keysToDelete.length} EMS cache entries`);
}

/**
 * Get a summary of all current cache entries (for debugging).
 */
export function getCacheStats(): { url: string; expiresIn: number; cachedAt: number }[] {
    if (!isBrowser()) return [];
    const stats: { url: string; expiresIn: number; cachedAt: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(CACHE_PREFIX)) continue;
        try {
            const entry: CacheEntry<unknown> = JSON.parse(localStorage.getItem(key) ?? '');
            stats.push({
                url: key.slice(CACHE_PREFIX.length),
                expiresIn: Math.max(0, entry.expiresAt - Date.now()),
                cachedAt: entry.cachedAt,
            });
        } catch {
            // skip corrupt entries
        }
    }
    return stats;
}

// ─── Derived: Auto-detect which prefixes a mutation URL affects ───────────────

/**
 * Given a mutated URL (e.g. POST /api/teams/123/join),
 * return the cache key prefixes that should be invalidated.
 *
 * The logic: take progressively higher-level path segments until we hit a
 * known API root (up to 3 segments deep), so mutations bust only the relevant
 * collection.
 *
 * Examples:
 *   /api/judging/allocations/auto   → ['/api/judging/allocations', '/api/judging']
 *   /api/teams/             → ['/api/teams']
 *   /api/admin/roles        → ['/api/admin']
 */
export function deriveInvalidationPrefixes(url: string): string[] {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const parts = path.split('/').filter(Boolean); // e.g. ['api', 'judging', 'allocations', 'auto']

    const prefixes: string[] = [];
    // Walk from most-specific to least-specific (up to 4 segments = '/api/x/y/z')
    for (let depth = parts.length; depth >= 2; depth--) {
        prefixes.push('/' + parts.slice(0, depth).join('/'));
    }
    return prefixes;
}

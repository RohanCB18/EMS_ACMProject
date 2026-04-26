/**
 * Robust API Client with Client-Side Caching
 *
 * - Automatically attaches Firebase ID token to Authorization header
 * - Handles JSON serialization/parsing
 * - Automatic retries for transient network failures (5xx)
 * - GET requests are cached in localStorage (via lib/cache.ts)
 * - Mutations (POST/PUT/PATCH/DELETE) auto-invalidate related cache entries
 */

import { getIdToken, API_URL } from './firebase';
import { cacheGet, cacheSet, deriveInvalidationPrefixes, invalidateByPrefix } from './cache';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
    /** Number of retry attempts for server errors / network failures. Default: 2 */
    retries?: number;
    /** Base delay in ms between retries (multiplied by attempt). Default: 1000 */
    retryDelay?: number;
    /**
     * Skip the cache and always hit the network.
     * Response will still be written to cache for future calls.
     * Default: false (cache is used for GET requests)
     */
    noCache?: boolean;
}

export class ApiError extends Error {
    constructor(public status: number, public data: any, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// ─── Core fetchApi ────────────────────────────────────────────────────────────

export async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { retries = 2, retryDelay = 1000, noCache = false, ...customOptions } = options;

    // Resolve full URL
    const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const method = (customOptions.method ?? 'GET').toUpperCase();
    const isGet = method === 'GET';

    // ── Cache read (GET only) ─────────────────────────────────────────────
    if (isGet && !noCache) {
        const cached = cacheGet<T>(url);
        if (cached !== null) {
            console.debug(`[cache] HIT  ${url}`);
            return cached;
        }
        console.debug(`[cache] MISS ${url}`);
    }

    // ── Build request headers ─────────────────────────────────────────────
    const headers = new Headers(customOptions.headers);
    if (!headers.has('Content-Type') && !(customOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    try {
        const token = await getIdToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    } catch (e) {
        console.warn('Failed to get Firebase token for API request', e);
    }

    const config: RequestInit = { ...customOptions, headers };

    // ── Fetch with retries ────────────────────────────────────────────────
    let attempt = 0;

    while (attempt <= retries) {
        try {
            const response = await fetch(url, config);

            if (response.ok) {
                // 204 No Content
                if (response.status === 204) return null as any;

                const data: T = await response.json();

                // ── Cache write (GET only) ────────────────────────────────
                if (isGet) {
                    cacheSet(url, data);
                }

                // ── Cache invalidation (mutations) ────────────────────────
                if (!isGet) {
                    const prefixes = deriveInvalidationPrefixes(url);
                    invalidateByPrefix(prefixes);
                    console.debug(`[cache] Invalidated on ${method} ${url}`, prefixes);
                }

                return data;
            }

            // Retry on server errors
            if (response.status >= 500 && attempt < retries) {
                console.warn(`API Server Error ${response.status}. Retrying... (${attempt + 1}/${retries})`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                attempt++;
                continue;
            }

            // Parse error and throw
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: response.statusText };
            }

            throw new ApiError(
                response.status,
                errorData,
                errorData.detail || `HTTP Error ${response.status}`,
            );

        } catch (error) {
            if (error instanceof ApiError) throw error;

            // Network failures — retry
            if (error instanceof TypeError && attempt < retries) {
                console.warn(`Network Error. Retrying... (${attempt + 1}/${retries})`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                attempt++;
                continue;
            }
            throw error;
        }
    }

    throw new Error('Max retries reached');
}

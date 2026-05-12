/**
 * Robust API Client
 * 
 * Automatically attaches the Firebase ID token to the Authorization header,
 * handles JSON serialization/parsing, and provides automatic retries for
 * transient network failures (502, 503, 504).
 */

import { getIdToken, API_URL } from './firebase';

interface FetchOptions extends RequestInit {
    retries?: number;
    retryDelay?: number;
}

export class ApiError extends Error {
    constructor(public status: number, public data: any, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { retries = 2, retryDelay = 1000, ...customOptions } = options;

    // Clean endpoint
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Setup headers and wait for token
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

    const config: RequestInit = {
        ...customOptions,
        headers,
    };

    let attempt = 0;

    while (attempt <= retries) {
        try {
            const response = await fetch(url, config);

            // Success
            if (response.ok) {
                // Return null if empty response (e.g., 204 No Content)
                if (response.status === 204) return null as any;
                return await response.json();
            }

            // Retry on server errors
            if (response.status >= 500 && attempt < retries) {
                console.warn(`API Server Error ${response.status}. Retrying... (${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
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
                errorData.detail || `HTTP Error ${response.status}`
            );

        } catch (error) {
            // Network failures
            if (error instanceof TypeError && attempt < retries) {
                console.warn(`Network Error. Retrying... (${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                attempt++;
                continue;
            }
            throw error;
        }
    }

    throw new Error('Max retries reached');
}

/**
 * Inference result cache
 * Simple LRU cache for model inference results
 */

import type { ModelRunResult, ModelRunParams } from './types';

interface CacheEntry {
    result: ModelRunResult;
    timestamp: number;
}

/**
 * Simple hash function for cache key
 */
function hashKey(inputIds: number[], params: ModelRunParams, modelVersion: string): string {
    const paramsStr = JSON.stringify({ ...params, modelVersion });
    const idsStr = inputIds.join(',');
    return `${idsStr}|${paramsStr}`;
}

class InferenceCache {
    private cache: Map<string, CacheEntry>;
    private maxEntries: number;

    constructor(maxEntries: number = 20) {
        this.cache = new Map();
        this.maxEntries = maxEntries;
    }

    /**
     * Get cached result
     */
    get(inputIds: number[], params: ModelRunParams, modelVersion: string): ModelRunResult | null {
        const key = hashKey(inputIds, params, modelVersion);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Update timestamp (LRU)
        entry.timestamp = Date.now();
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.result;
    }

    /**
     * Set cache entry
     */
    set(inputIds: number[], params: ModelRunParams, modelVersion: string, result: ModelRunResult): void {
        const key = hashKey(inputIds, params, modelVersion);

        // Remove oldest entry if at capacity
        if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
            // Find oldest entry
            let oldestKey: string | null = null;
            let oldestTime = Infinity;

            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp < oldestTime) {
                    oldestTime = v.timestamp;
                    oldestKey = k;
                }
            }

            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            result,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { entries: number; maxEntries: number } {
        return {
            entries: this.cache.size,
            maxEntries: this.maxEntries,
        };
    }

    /**
     * Clear entries for a specific model version (cache invalidation)
     */
    clearForVersion(modelVersion: string): void {
        const keysToDelete: string[] = [];
        for (const [key, entry] of this.cache.entries()) {
            if (entry.result.modelVersion !== modelVersion) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach((key) => this.cache.delete(key));
    }
}

// Singleton instance
let cacheInstance: InferenceCache | null = null;

/**
 * Get cache instance
 */
export function getCache(maxEntries?: number): InferenceCache {
    if (!cacheInstance) {
        cacheInstance = new InferenceCache(maxEntries);
    }
    return cacheInstance;
}

/**
 * Reset cache instance (for testing)
 */
export function resetCache(): void {
    cacheInstance = null;
}


/**
 * Model state management
 * Tracks session status, last inference result, and cache statistics
 */
import { writable, derived } from 'svelte/store';
import type { ModelRunResult, SessionStatus, CacheStats } from '../model/types';

export interface ModelState {
    // Session state
    sessionStatus: SessionStatus;
    ep: 'webgpu' | 'wasm' | 'unknown';
    errorMessage: string | null;

    // Inference state
    isInferring: boolean;
    lastResult: ModelRunResult | null;

    // Performance
    timing: {
        loadMs: number | null;
        inferMs: number | null;
        avgInferMs: number | null; // Average of last N inferences
    };

    // Cache
    cacheStats: CacheStats;
    modelVersion: string;
}

const initialState: ModelState = {
    sessionStatus: 'idle',
    ep: 'unknown',
    errorMessage: null,
    isInferring: false,
    lastResult: null,
    timing: {
        loadMs: null,
        inferMs: null,
        avgInferMs: null,
    },
    cacheStats: {
        hits: 0,
        misses: 0,
        entries: 0,
        maxEntries: 20,
    },
    modelVersion: '1.0.0',
};

export const modelStore = writable<ModelState>(initialState);

/**
 * Derived store for ready state
 */
export const isModelReady = derived(
    modelStore,
    ($store) => $store.sessionStatus === 'ready'
);

/**
 * Derived store for error state
 */
export const modelError = derived(
    modelStore,
    ($store) => $store.errorMessage
);

/**
 * Model store actions
 */
export const modelActions = {
    setSessionStatus(status: SessionStatus) {
        modelStore.update((state) => ({
            ...state,
            sessionStatus: status,
            errorMessage: status === 'error' ? state.errorMessage : null,
        }));
    },

    setEP(ep: 'webgpu' | 'wasm' | 'unknown') {
        modelStore.update((state) => ({
            ...state,
            ep,
        }));
    },

    setError(message: string) {
        modelStore.update((state) => ({
            ...state,
            sessionStatus: 'error',
            errorMessage: message,
            isInferring: false,
        }));
    },

    clearError() {
        modelStore.update((state) => ({
            ...state,
            errorMessage: null,
            sessionStatus: state.sessionStatus === 'error' ? 'idle' : state.sessionStatus,
        }));
    },

    setLoading(loading: boolean) {
        modelStore.update((state) => ({
            ...state,
            sessionStatus: loading ? 'loading' : state.sessionStatus,
        }));
    },

    setInferring(inferring: boolean) {
        modelStore.update((state) => ({
            ...state,
            isInferring: inferring,
        }));
    },

    setLastResult(result: ModelRunResult) {
        modelStore.update((state) => {
            // Update timing
            const inferMs = result.timing.inferMs;
            const recentInferTimes = state.timing.inferMs
                ? [state.timing.inferMs, inferMs]
                : [inferMs];
            const avgInferMs =
                recentInferTimes.reduce((a, b) => a + b, 0) / recentInferTimes.length;

            return {
                ...state,
                lastResult: result,
                timing: {
                    ...state.timing,
                    loadMs: result.timing.loadMs,
                    inferMs,
                    avgInferMs,
                },
                ep: result.ep,
                modelVersion: result.modelVersion,
            };
        });
    },

    setLoadTime(loadMs: number) {
        modelStore.update((state) => ({
            ...state,
            timing: {
                ...state.timing,
                loadMs,
            },
        }));
    },

    updateCacheStats(stats: Partial<CacheStats>) {
        modelStore.update((state) => ({
            ...state,
            cacheStats: {
                ...state.cacheStats,
                ...stats,
            },
        }));
    },

    reset() {
        modelStore.set(initialState);
    },
};


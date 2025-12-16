/**
 * Inference state management
 * Tracks model session, generation state, and performance metrics
 */
import { writable, derived } from 'svelte/store';
import type { SessionInfo } from '../model/session';
import type { ModelLoadError, EPNotSupportedError, InferenceError } from '../model/errors';

export interface InferenceState {
  // Session state
  session: SessionInfo | null;
  isLoading: boolean;
  error: ModelLoadError | EPNotSupportedError | InferenceError | null;

  // Generation state
  isGenerating: boolean;
  outputText: string;
  generatedTokens: number[];

  // Performance metrics
  modelLoadTimeMs: number | null;
  lastInferenceTimeMs: number | null;
  totalInferenceTimeMs: number;
}

const initialState: InferenceState = {
  session: null,
  isLoading: false,
  error: null,
  isGenerating: false,
  outputText: '',
  generatedTokens: [],
  modelLoadTimeMs: null,
  lastInferenceTimeMs: null,
  totalInferenceTimeMs: 0,
};

export const inferenceStore = writable<InferenceState>(initialState);

/**
 * Derived store for execution provider display
 */
export const executionProvider = derived(
  inferenceStore,
  ($store) => $store.session?.executionProvider || null
);

/**
 * Derived store for performance metrics display
 */
export const performanceMetrics = derived(inferenceStore, ($store) => ({
  modelLoadTime: $store.modelLoadTimeMs,
  lastInferenceTime: $store.lastInferenceTimeMs,
  totalInferenceTime: $store.totalInferenceTimeMs,
  executionProvider: $store.session?.executionProvider || null,
}));

/**
 * Helper functions to update inference store
 */
export const inferenceActions = {
  setSession(session: SessionInfo) {
    inferenceStore.update((state) => ({
      ...state,
      session,
      isLoading: false,
      error: null,
      modelLoadTimeMs: session.loadTimeMs,
    }));
  },

  setLoading(loading: boolean) {
    inferenceStore.update((state) => ({
      ...state,
      isLoading: loading,
      error: loading ? null : state.error, // Clear error when starting to load
    }));
  },

  setError(error: ModelLoadError | EPNotSupportedError | InferenceError) {
    inferenceStore.update((state) => ({
      ...state,
      error,
      isLoading: false,
      isGenerating: false,
    }));
  },

  setGenerating(generating: boolean) {
    inferenceStore.update((state) => ({
      ...state,
      isGenerating: generating,
    }));
  },

  appendToken(tokenId: number, tokenText: string) {
    inferenceStore.update((state) => ({
      ...state,
      outputText: state.outputText + tokenText,
      generatedTokens: [...state.generatedTokens, tokenId],
    }));
  },

  setOutputText(text: string) {
    inferenceStore.update((state) => ({
      ...state,
      outputText: text,
      generatedTokens: [],
    }));
  },

  recordInferenceTime(timeMs: number) {
    inferenceStore.update((state) => ({
      ...state,
      lastInferenceTimeMs: timeMs,
      totalInferenceTimeMs: state.totalInferenceTimeMs + timeMs,
    }));
  },

  reset() {
    inferenceStore.set(initialState);
  },
};


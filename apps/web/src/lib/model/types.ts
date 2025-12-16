/**
 * Model inference types and data contracts
 * Aligned with DOCS/ACTIVATIONS_CONTRACT.md
 */

import type { Token } from '../viz/types';

/**
 * Model run parameters
 */
export interface ModelRunParams {
    temperature: number;
    samplingMode: 'top-k' | 'top-p';
    topK: number;
    topP: number;
}

/**
 * Activation tensors from a single layer
 */
export interface LayerActivations {
    layerIndex: number;
    attnProbs?: Float32Array; // [num_heads, seq_len, seq_len] or [batch, num_heads, seq_len, seq_len]
    mlpOutput?: Float32Array; // [seq_len, hidden_size] or [batch, seq_len, hidden_size]
    qkv?: Float32Array; // Optional: QKV concatenated
    q?: Float32Array; // Optional: Q
    k?: Float32Array; // Optional: K
    v?: Float32Array; // Optional: V
}

/**
 * All activation tensors from model inference
 */
export interface ActivationTensors {
    embedding?: Float32Array; // [seq_len, hidden_size] or [batch, seq_len, hidden_size]
    layers: LayerActivations[];
}

/**
 * Model run result
 */
export interface ModelRunResult {
    // Input/Output
    tokens: Token[];
    inputIds: number[];
    outputIds?: number[]; // Generated tokens

    // Model outputs
    logits: Float32Array; // [seq_len, vocab_size] or [batch, seq_len, vocab_size]
    probs?: Float32Array; // Temperature-scaled and filtered probabilities
    activations: ActivationTensors;

    // Metadata
    timing: {
        loadMs: number; // Model load time
        inferMs: number; // Inference time
    };
    ep: 'webgpu' | 'wasm' | 'unknown'; // Execution provider
    modelVersion: string; // For cache invalidation
}

/**
 * Session status
 */
export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Cache statistics
 */
export interface CacheStats {
    hits: number;
    misses: number;
    entries: number;
    maxEntries: number;
}


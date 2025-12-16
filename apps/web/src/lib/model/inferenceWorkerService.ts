/**
 * Inference service using Worker
 * Replaces direct ONNX Runtime calls with Worker-based inference
 */
import { initWorker, runInference, terminateWorker } from './workerClient';
import { getCache } from './cache';
import { getModelUrl, getModelVersion, getTokenizerBaseUrl } from './config';
import { initTokenizer, type GPT2Tokenizer } from './tokenizer';
import { DEFAULT_TOKENIZER_CONFIG } from './config';
import { modelActions, modelStore } from '../state/modelStore';
import { inferenceActions } from '../state/inferenceStore';
import type { ModelRunParams } from './types';
import { InferenceError } from './errors';
import { get } from 'svelte/store';
import { inferenceStore } from '../state/inferenceStore';

/**
 * Initialize inference service with Worker
 */
export async function initInferenceWorkerService(basePath: string = '/'): Promise<void> {
  // Initialize tokenizer
  try {
    const tokenizerBaseUrl = getTokenizerBaseUrl(basePath);
    const config = {
      baseUrl: tokenizerBaseUrl,
      useCacheStorage: DEFAULT_TOKENIZER_CONFIG.useCacheStorage,
      cacheVersion: DEFAULT_TOKENIZER_CONFIG.cacheVersion,
    };

    const tokenizer = await initTokenizer(
      config,
      DEFAULT_TOKENIZER_CONFIG.vocabPath,
      DEFAULT_TOKENIZER_CONFIG.mergesPath,
      DEFAULT_TOKENIZER_CONFIG.tokenizerPath
    );

    inferenceActions.setTokenizer(tokenizer);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Failed to load tokenizer');
    inferenceActions.setTokenizerError(errorObj);
    throw errorObj;
  }
}

/**
 * Load model via Worker
 */
export async function loadModelWorker(
  basePath: string = '/',
  preferWebGPU: boolean = true
): Promise<void> {
  modelActions.setLoading(true);
  modelActions.clearError();

  try {
    const modelUrl = getModelUrl(basePath);
    const modelVersion = getModelVersion();

    // Initialize worker and load model
    const { ep, loadTimeMs } = await initWorker(modelUrl, preferWebGPU, modelVersion);

    modelActions.setEP(ep);
    modelActions.setLoadTime(loadTimeMs);
    modelActions.setSessionStatus('ready');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
    modelActions.setError(errorMessage);
    modelActions.setSessionStatus('error');
    throw new InferenceError(errorMessage, error as Error);
  }
}

/**
 * Generate next token using Worker
 */
export async function generateNextTokenWorker(
  inputText: string,
  temperature: number,
  samplingMode: 'top-k' | 'top-p',
  topK: number,
  topP: number
): Promise<number> {
  const state = get(inferenceStore);
  const tokenizer = state.tokenizer;

  if (!tokenizer) {
    throw new InferenceError('Tokenizer not loaded. Please load tokenizer first.');
  }

  // Check cache
  const cache = getCache();
  const inputIds = tokenizer.encode(inputText);
  const tokens = tokenizer.tokenizeWithOffsets(inputText).map((t) => ({
    id: t.id.toString(),
    text: t.text,
  }));

  const params: ModelRunParams = {
    temperature,
    samplingMode,
    topK,
    topP,
  };

  const modelVersion = getModelVersion();
  const cached = cache.get(inputIds, params, modelVersion);

  if (cached) {
    // Update cache stats
    const currentStats = get(modelStore).cacheStats;
    modelActions.updateCacheStats({
      hits: currentStats.hits + 1,
    });

    // Set result
    modelActions.setLastResult(cached);

    // Return sampled token
    if (cached.probs) {
      const tokenId = sampleFromProbs(cached.probs);
      return tokenId;
    }
  }

  // Update cache stats (miss)
  const currentStats = get(modelStore).cacheStats;
  modelActions.updateCacheStats({
    misses: currentStats.misses + 1,
  });

  modelActions.setInferring(true);
  inferenceActions.setGenerating(true);

  try {
    // Run inference via worker
    const result = await runInference(inputIds, tokens, params);

    // Cache result
    cache.set(inputIds, params, modelVersion, result);

    // Update cache stats
    const stats = cache.getStats();
    modelActions.updateCacheStats({
      entries: stats.entries,
    });

    // Set result
    modelActions.setLastResult(result);

    // Sample token
    if (result.probs) {
      const tokenId = sampleFromProbs(result.probs);
      return tokenId;
    } else {
      // Fallback: sample from logits
      const probs = stableSoftmax(result.logits, temperature);
      const tokenId = sampleFromProbs(probs);
      return tokenId;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Generation failed';
    modelActions.setError(errorMessage);
    throw new InferenceError(errorMessage, error as Error);
  } finally {
    modelActions.setInferring(false);
    inferenceActions.setGenerating(false);
  }
}

/**
 * Sample from probability distribution
 */
function sampleFromProbs(probs: Float32Array): number {
  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (random <= cumulative) {
      return i;
    }
  }

  return probs.length - 1;
}

/**
 * Stable softmax
 */
function stableSoftmax(logits: Float32Array, temperature: number): Float32Array {
  const scaled = new Float32Array(logits.length);
  let maxLogit = -Infinity;

  for (let i = 0; i < logits.length; i++) {
    scaled[i] = logits[i] / temperature;
    if (scaled[i] > maxLogit) {
      maxLogit = scaled[i];
    }
  }

  let sum = 0;
  for (let i = 0; i < scaled.length; i++) {
    scaled[i] = Math.exp(scaled[i] - maxLogit);
    sum += scaled[i];
  }

  const probs = new Float32Array(scaled.length);
  for (let i = 0; i < scaled.length; i++) {
    probs[i] = scaled[i] / sum;
  }

  return probs;
}

/**
 * Cleanup worker
 */
export function cleanupWorker(): void {
  terminateWorker();
}


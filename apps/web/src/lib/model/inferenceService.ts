/**
 * Inference service
 * Orchestrates model loading, inference, and token generation
 */
import { initOrtEnv } from './ortEnv';
import { createSession, type SessionConfig } from './session';
import { runLogits } from './run';
import {
  stableSoftmax,
  topKFilter,
  nucleusTopPFilter,
  sampleFromProbs,
} from './sampling';
import { inferenceActions } from '../state/inferenceStore';
import { getModelUrl, DEFAULT_MODEL_CONFIG, DEFAULT_TOKENIZER_CONFIG } from './config';
import type { ModelLoadError, EPNotSupportedError, InferenceError } from './errors';
import { initTokenizer, type GPT2Tokenizer } from './tokenizer';
import { get } from 'svelte/store';
import { inferenceStore } from '../state/inferenceStore';

/**
 * Initialize inference service
 * Sets up ORT environment and loads tokenizer
 */
export function initInferenceService(basePath: string = '/'): void {
  initOrtEnv(basePath);
}

/**
 * Load tokenizer
 * @param basePath - App base path
 * @param vocabPath - Path to vocab.json (optional)
 * @param mergesPath - Path to merges.txt (optional)
 * @param tokenizerPath - Path to tokenizer.json (optional, alternative)
 */
export async function loadTokenizer(
  basePath: string = '/',
  vocabPath?: string,
  mergesPath?: string,
  tokenizerPath?: string
): Promise<void> {
  inferenceActions.setTokenizerLoading(true);

  try {
    const config = {
      baseUrl: basePath,
      useCacheStorage: DEFAULT_TOKENIZER_CONFIG.useCacheStorage,
      cacheVersion: DEFAULT_TOKENIZER_CONFIG.cacheVersion,
    };

    const tokenizer = await initTokenizer(
      config,
      vocabPath || DEFAULT_TOKENIZER_CONFIG.vocabPath,
      mergesPath || DEFAULT_TOKENIZER_CONFIG.mergesPath,
      tokenizerPath || DEFAULT_TOKENIZER_CONFIG.tokenizerPath
    );

    inferenceActions.setTokenizer(tokenizer);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Failed to load tokenizer');
    inferenceActions.setTokenizerError(errorObj);
    throw errorObj;
  }
}

/**
 * Load model and create session
 */
export async function loadModel(
  modelPath?: string,
  basePath: string = '/',
  preferWebGPU: boolean = true
): Promise<void> {
  inferenceActions.setLoading(true);

  try {
    const modelUrl = getModelUrl(
      modelPath || DEFAULT_MODEL_CONFIG.modelPath,
      basePath
    );

    const config: SessionConfig = {
      modelUrl,
      preferWebGPU,
      inputName: DEFAULT_MODEL_CONFIG.inputName,
      outputName: DEFAULT_MODEL_CONFIG.outputName,
    };

    const session = await createSession(config);
    inferenceActions.setSession(session);
  } catch (error) {
    if (
      error instanceof ModelLoadError ||
      error instanceof EPNotSupportedError
    ) {
      inferenceActions.setError(error);
    } else {
      inferenceActions.setError(
        new ModelLoadError(
          `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error as Error
        )
      );
    }
    throw error;
  }
}

/**
 * Generate next token from input text
 * @param inputText - Input text to generate from
 * @param temperature - Temperature for sampling
 * @param samplingMode - 'top-k' or 'top-p'
 * @param topK - Top-K value (if using top-k)
 * @param topP - Top-P value (if using top-p)
 * @returns Generated token ID
 */
export async function generateNextToken(
  inputText: string,
  temperature: number,
  samplingMode: 'top-k' | 'top-p',
  topK: number,
  topP: number
): Promise<number> {
  // Get current session from store
  const state = get(inferenceStore);
  const currentSession = state.session;

  if (!currentSession) {
    throw new InferenceError('Model session not loaded. Please load model first.');
  }

  inferenceActions.setGenerating(true);
  const startTime = performance.now();

  try {
    // Get tokenizer from store
    const tokenizer = state.tokenizer;
    if (!tokenizer) {
      throw new InferenceError('Tokenizer not loaded. Please load tokenizer first.');
    }

    // Encode input text to token IDs
    const inputIds = tokenizer.encode(inputText);
    
    // Store input tokens with offsets for visualization
    const inputTokens = tokenizer.tokenizeWithOffsets(inputText);
    inferenceActions.setInputTokens(inputTokens);

    // Run inference to get logits
    const logits = await runLogits(currentSession.session, inputIds, {
      inputName: DEFAULT_MODEL_CONFIG.inputName,
      outputName: DEFAULT_MODEL_CONFIG.outputName,
    });

    // Apply temperature scaling and softmax
    const probs = stableSoftmax(logits, temperature);

    // Apply filtering (top-k or top-p)
    let filteredProbs = probs;
    if (samplingMode === 'top-k') {
      filteredProbs = topKFilter(probs, topK);
    } else {
      filteredProbs = nucleusTopPFilter(probs, topP);
    }

    // Sample token
    const tokenId = sampleFromProbs(filteredProbs);

    // Record inference time
    const inferenceTime = performance.now() - startTime;
    inferenceActions.recordInferenceTime(inferenceTime);

    return tokenId;
  } catch (error) {
    inferenceActions.setError(
      new InferenceError(
        `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error as Error
      )
    );
    throw error;
  } finally {
    inferenceActions.setGenerating(false);
  }
}



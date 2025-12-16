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
import { getModelUrl, DEFAULT_MODEL_CONFIG } from './config';
import type { ModelLoadError, EPNotSupportedError, InferenceError } from './errors';

/**
 * Simple tokenizer placeholder
 * In production, this should use the actual tokenizer (e.g., from transformers.js or custom)
 * For now, we'll use a simple character-level or word-level tokenizer
 */
export class SimpleTokenizer {
  private vocab: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();
  private nextId = 0;

  constructor() {
    // Initialize with basic ASCII characters and common tokens
    // This is a placeholder - replace with actual tokenizer
    this.addToken('<pad>');
    this.addToken('<unk>');
    this.addToken('<bos>');
    this.addToken('<eos>');
    
    // Add ASCII printable characters
    for (let i = 32; i < 127; i++) {
      this.addToken(String.fromCharCode(i));
    }
  }

  private addToken(token: string): number {
    if (!this.vocab.has(token)) {
      const id = this.nextId++;
      this.vocab.set(token, id);
      this.reverseVocab.set(id, token);
      return id;
    }
    return this.vocab.get(token)!;
  }

  encode(text: string): number[] {
    // Simple character-level encoding
    // In production, use proper tokenizer
    const tokens: number[] = [];
    for (const char of text) {
      const id = this.vocab.get(char) ?? this.vocab.get('<unk>') ?? 0;
      tokens.push(id);
    }
    return tokens;
  }

  decode(tokenIds: number[]): string {
    return tokenIds
      .map((id) => this.reverseVocab.get(id) ?? '<unk>')
      .join('');
  }

  decodeToken(tokenId: number): string {
    return this.reverseVocab.get(tokenId) ?? '<unk>';
  }

  getVocabSize(): number {
    return this.vocab.size;
  }
}

// Global tokenizer instance (placeholder)
// TODO: Replace with actual tokenizer from model
export const tokenizer = new SimpleTokenizer();

/**
 * Initialize inference service
 * Sets up ORT environment
 */
export function initInferenceService(basePath: string = '/'): void {
  initOrtEnv(basePath);
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
    // Encode input text to token IDs
    const inputIds = tokenizer.encode(inputText);

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

// Import inferenceStore to access current state
import { get } from 'svelte/store';
import { inferenceStore } from '../state/inferenceStore';


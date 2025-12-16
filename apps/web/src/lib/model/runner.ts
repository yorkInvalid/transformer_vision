/**
 * Model inference runner
 * Handles ONNX session execution and result unpacking
 * Aligned with DOCS/ACTIVATIONS_CONTRACT.md
 */

import * as ort from 'onnxruntime-web';
import type { InferenceSession } from 'onnxruntime-web';
import type { ModelRunParams, ModelRunResult, ActivationTensors, LayerActivations } from './types';
import type { Token } from '../viz/types';
import { stableSoftmax, topKFilter, nucleusTopPFilter } from './sampling';
import { InferenceError } from './errors';

/**
 * Unpack activations from ONNX output dictionary
 * @param outputs - ONNX session outputs
 * @param expectedLayers - Expected layer indices (for validation)
 * @returns ActivationTensors
 */
function unpackActivations(
  outputs: Record<string, ort.Tensor>,
  expectedLayers?: number[]
): ActivationTensors {
  const activations: ActivationTensors = {
    layers: [],
  };

  // Extract embedding
  if (outputs['embedding_sum']) {
    const tensor = outputs['embedding_sum'];
    activations.embedding = tensor.data as Float32Array;
  }

  // Extract layer activations
  const layerIndices = new Set<number>();

  // Find all layer indices from output names
  for (const name of Object.keys(outputs)) {
    const attnMatch = name.match(/^layer_(\d+)_attn_probs$/);
    if (attnMatch) {
      layerIndices.add(parseInt(attnMatch[1], 10));
    }
  }

  // If expectedLayers provided, validate
  if (expectedLayers) {
    const missing = expectedLayers.filter((idx) => !layerIndices.has(idx));
    if (missing.length > 0) {
      console.warn(`Missing activations for layers: ${missing.join(', ')}`);
    }
  }

  // Build layer activations
  for (const layerIdx of Array.from(layerIndices).sort()) {
    const layerPrefix = `layer_${layerIdx}`;
    const layer: LayerActivations = {
      layerIndex: layerIdx,
    };

    // Attention probabilities
    const attnKey = `${layerPrefix}_attn_probs`;
    if (outputs[attnKey]) {
      const tensor = outputs[attnKey];
      layer.attnProbs = tensor.data as Float32Array;

      // Validate shape: [num_heads, seq_len, seq_len] or [batch, num_heads, seq_len, seq_len]
      const shape = tensor.dims;
      if (shape.length !== 3 && shape.length !== 4) {
        throw new InferenceError(
          `Invalid attn_probs shape for layer ${layerIdx}: expected 3D or 4D, got ${shape.length}D`
        );
      }
    }

    // MLP output
    const mlpKey = `${layerPrefix}_mlp_output`;
    if (outputs[mlpKey]) {
      const tensor = outputs[mlpKey];
      layer.mlpOutput = tensor.data as Float32Array;
    }

    // QKV (optional)
    const qkvKey = `${layerPrefix}_qkv`;
    if (outputs[qkvKey]) {
      const tensor = outputs[qkvKey];
      layer.qkv = tensor.data as Float32Array;
    }

    // Q, K, V (optional, alternative to qkv)
    const qKey = `${layerPrefix}_q`;
    const kKey = `${layerPrefix}_k`;
    const vKey = `${layerPrefix}_v`;
    if (outputs[qKey]) layer.q = outputs[qKey].data as Float32Array;
    if (outputs[kKey]) layer.k = outputs[kKey].data as Float32Array;
    if (outputs[vKey]) layer.v = outputs[vKey].data as Float32Array;

    activations.layers.push(layer);
  }

  return activations;
}

/**
 * Extract logits from ONNX output
 * Handles different shapes: [seq_len, vocab_size] or [batch, seq_len, vocab_size]
 */
function extractLogits(outputs: Record<string, ort.Tensor>, outputName: string): Float32Array {
  const tensor = outputs[outputName];
  if (!tensor) {
    throw new InferenceError(`Output tensor '${outputName}' not found`);
  }

  const data = tensor.data as Float32Array;
  const shape = tensor.dims;

  // Handle different shapes
  if (shape.length === 3) {
    // [batch, seq_len, vocab_size] -> take last token
    const batchSize = shape[0];
    const seqLen = shape[1];
    const vocabSize = shape[2];
    const lastTokenOffset = (batchSize - 1) * seqLen * vocabSize + (seqLen - 1) * vocabSize;
    return data.slice(lastTokenOffset, lastTokenOffset + vocabSize);
  } else if (shape.length === 2) {
    // [seq_len, vocab_size] -> take last token
    const seqLen = shape[0];
    const vocabSize = shape[1];
    const lastTokenOffset = (seqLen - 1) * vocabSize;
    return data.slice(lastTokenOffset, lastTokenOffset + vocabSize);
  } else if (shape.length === 1) {
    // [vocab_size] -> already correct
    return data;
  } else {
    throw new InferenceError(`Unexpected logits shape: [${shape.join(', ')}]`);
  }
}

/**
 * Run model inference and unpack results
 * @param session - ONNX inference session
 * @param inputIds - Input token IDs
 * @param tokens - Token objects for visualization
 * @param params - Sampling parameters
 * @param modelVersion - Model version for cache invalidation
 * @param ep - Execution provider
 * @param loadTimeMs - Model load time
 * @returns ModelRunResult
 */
export async function runModel(
  session: InferenceSession,
  inputIds: number[],
  tokens: Token[],
  params: ModelRunParams,
  modelVersion: string,
  ep: 'webgpu' | 'wasm' | 'unknown',
  loadTimeMs: number
): Promise<ModelRunResult> {
  const startTime = performance.now();

  try {
    // Get input/output names
    const inputName = session.inputNames[0] || 'input_ids';
    const outputName = session.outputNames.find((n) => n === 'logits') || session.outputNames[0];

    // Prepare input tensor
    // Shape: [batch_size, sequence_length] or [sequence_length]
    const inputShape = [1, inputIds.length];
    const inputTensor = new ort.Tensor(
      'int64',
      BigInt64Array.from(inputIds.map(BigInt)),
      inputShape
    );

    // Run inference
    const feeds = { [inputName]: inputTensor };
    const results = await session.run(feeds);

    // Convert results to dictionary
    const outputs: Record<string, ort.Tensor> = {};
    for (let i = 0; i < session.outputNames.length; i++) {
      const name = session.outputNames[i];
      outputs[name] = results[i];
    }

    // Extract logits
    const logits = extractLogits(outputs, outputName);

    // Apply temperature and sampling filters
    const probs = stableSoftmax(logits, params.temperature);
    let filteredProbs = probs;
    if (params.samplingMode === 'top-k') {
      filteredProbs = topKFilter(probs, params.topK);
    } else {
      filteredProbs = nucleusTopPFilter(probs, params.topP);
    }

    // Unpack activations
    const activations = unpackActivations(outputs);

    // Validate activations
    if (activations.layers.length === 0) {
      console.warn('No layer activations found in model outputs');
    }

    const inferMs = performance.now() - startTime;

    return {
      tokens,
      inputIds,
      logits,
      probs: filteredProbs,
      activations,
      timing: {
        loadMs: loadTimeMs,
        inferMs,
      },
      ep,
      modelVersion,
    };
  } catch (error) {
    throw new InferenceError(
      `Inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error as Error
    );
  }
}


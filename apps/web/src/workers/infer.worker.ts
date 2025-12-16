/**
 * Inference Worker
 * Runs ONNX model inference in a Web Worker to avoid blocking the main thread
 */

import * as ort from 'onnxruntime-web';
import type { InferenceSession } from 'onnxruntime-web';
import type { ModelRunParams, ModelRunResult, ActivationTensors, LayerActivations } from '../lib/model/types';
import type { Token } from '../lib/viz/types';
import { stableSoftmax, topKFilter, nucleusTopPFilter } from '../lib/model/sampling';

// Worker state
let session: InferenceSession | null = null;
let currentEP: 'webgpu' | 'wasm' | 'unknown' = 'unknown';
let currentModelVersion: string = '1.0.0';
let supersededRequests: Set<string> = new Set();

/**
 * Check if WebGPU is available
 */
async function isWebGPUAvailable(): Promise<boolean> {
  if (!('gpu' in self)) {
    return false;
  }
  try {
    const adapter = await (self as any).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Initialize ONNX session
 */
async function initSession(modelUrl: string, preferWebGPU: boolean, modelVersion: string): Promise<void> {
  const startTime = performance.now();

  // Determine execution provider
  let ep: 'webgpu' | 'wasm' = 'wasm';
  const providers: string[] = [];

  if (preferWebGPU) {
    const webgpuAvailable = await isWebGPUAvailable();
    if (webgpuAvailable) {
      ep = 'webgpu';
      providers.push('webgpu');
    }
  }

  providers.push('wasm');

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: providers,
    graphOptimizationLevel: 'all',
  };

  try {
    session = await ort.InferenceSession.create(modelUrl, sessionOptions);
    currentEP = ep;
    currentModelVersion = modelVersion;
    const loadTimeMs = performance.now() - startTime;

    // Send success response
    self.postMessage({
      type: 'init_success',
      payload: {
        ep: currentEP,
        loadTimeMs,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('webgpu') || errorMessage.includes('WebGPU')) {
      self.postMessage({
        type: 'error',
        payload: {
          code: 'EP_NOT_SUPPORTED',
          message: `WebGPU not supported: ${errorMessage}`,
          detail: error,
        },
      });
    } else {
      self.postMessage({
        type: 'error',
        payload: {
          code: 'MODEL_LOAD_FAIL',
          message: `Failed to load model: ${errorMessage}`,
          detail: error,
        },
      });
    }
  }
}

/**
 * Unpack activations from ONNX outputs
 */
function unpackActivations(outputs: Record<string, ort.Tensor>): ActivationTensors {
  const activations: ActivationTensors = {
    layers: [],
  };

  // Extract embedding
  if (outputs['embedding_sum']) {
    activations.embedding = outputs['embedding_sum'].data as Float32Array;
  }

  // Extract layer activations
  const layerIndices = new Set<number>();
  for (const name of Object.keys(outputs)) {
    const attnMatch = name.match(/^layer_(\d+)_attn_probs$/);
    if (attnMatch) {
      layerIndices.add(parseInt(attnMatch[1], 10));
    }
  }

  for (const layerIdx of Array.from(layerIndices).sort()) {
    const layerPrefix = `layer_${layerIdx}`;
    const layer: LayerActivations = {
      layerIndex: layerIdx,
    };

    const attnKey = `${layerPrefix}_attn_probs`;
    if (outputs[attnKey]) {
      layer.attnProbs = outputs[attnKey].data as Float32Array;
    }

    const mlpKey = `${layerPrefix}_mlp_output`;
    if (outputs[mlpKey]) {
      layer.mlpOutput = outputs[mlpKey].data as Float32Array;
    }

    activations.layers.push(layer);
  }

  return activations;
}

/**
 * Extract logits from output
 */
function extractLogits(outputs: Record<string, ort.Tensor>, outputName: string): Float32Array {
  const tensor = outputs[outputName];
  if (!tensor) {
    throw new Error(`Output tensor '${outputName}' not found`);
  }

  const data = tensor.data as Float32Array;
  const shape = tensor.dims;

  if (shape.length === 3) {
    const batchSize = shape[0];
    const seqLen = shape[1];
    const vocabSize = shape[2];
    const lastTokenOffset = (batchSize - 1) * seqLen * vocabSize + (seqLen - 1) * vocabSize;
    return data.slice(lastTokenOffset, lastTokenOffset + vocabSize);
  } else if (shape.length === 2) {
    const seqLen = shape[0];
    const vocabSize = shape[1];
    const lastTokenOffset = (seqLen - 1) * vocabSize;
    return data.slice(lastTokenOffset, lastTokenOffset + vocabSize);
  } else if (shape.length === 1) {
    return data;
  } else {
    throw new Error(`Unexpected logits shape: [${shape.join(', ')}]`);
  }
}

/**
 * Run inference
 */
async function runInference(
  requestId: string,
  inputIds: number[],
  tokens: Token[],
  params: ModelRunParams
): Promise<void> {
  if (!session) {
    self.postMessage({
      type: 'error',
      payload: {
        requestId,
        code: 'MODEL_LOAD_FAIL',
        message: 'Session not initialized',
      },
    });
    return;
  }

  // Check if request was superseded
  if (supersededRequests.has(requestId)) {
    supersededRequests.delete(requestId);
    return; // Don't send response
  }

  const startTime = performance.now();

  try {
    const inputName = session.inputNames[0] || 'input_ids';
    const outputName = session.outputNames.find((n) => n === 'logits') || session.outputNames[0];

    // Prepare input
    const inputShape = [1, inputIds.length];
    const inputTensor = new ort.Tensor(
      'int64',
      BigInt64Array.from(inputIds.map(BigInt)),
      inputShape
    );

    // Run inference
    const feeds = { [inputName]: inputTensor };
    const results = await session.run(feeds);

    // Convert to dictionary
    const outputs: Record<string, ort.Tensor> = {};
    for (let i = 0; i < session.outputNames.length; i++) {
      outputs[session.outputNames[i]] = results[i];
    }

    // Extract logits
    const logits = extractLogits(outputs, outputName);

    // Apply sampling
    const probs = stableSoftmax(logits, params.temperature);
    let filteredProbs = probs;
    if (params.samplingMode === 'top-k') {
      filteredProbs = topKFilter(probs, params.topK);
    } else {
      filteredProbs = nucleusTopPFilter(probs, params.topP);
    }

    // Unpack activations
    const activations = unpackActivations(outputs);

    const inferMs = performance.now() - startTime;

    // Check again if superseded
    if (supersededRequests.has(requestId)) {
      supersededRequests.delete(requestId);
      return;
    }

    const result: ModelRunResult = {
      tokens,
      inputIds,
      logits,
      probs: filteredProbs,
      activations,
      timing: {
        loadMs: 0, // Will be set by main thread
        inferMs,
      },
      ep: currentEP,
      modelVersion: currentModelVersion,
    };

    self.postMessage({
      type: 'result',
      payload: {
        requestId,
        result,
      },
    });
  } catch (error) {
    if (supersededRequests.has(requestId)) {
      supersededRequests.delete(requestId);
      return;
    }

    self.postMessage({
      type: 'error',
      payload: {
        requestId,
        code: 'INFER_FAIL',
        message: error instanceof Error ? error.message : 'Unknown error',
        detail: error,
      },
    });
  }
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'init':
      await initSession(payload.modelUrl, payload.preferWebGPU, payload.modelVersion);
      break;

    case 'run':
      // Mark previous requests as superseded
      if (payload.requestId) {
        // Clear old superseded requests (keep only recent ones)
        if (supersededRequests.size > 10) {
          supersededRequests.clear();
        }
      }
      await runInference(
        payload.requestId,
        payload.inputIds,
        payload.tokens,
        payload.params
      );
      break;

    case 'cancel':
      if (payload.requestId) {
        supersededRequests.add(payload.requestId);
      }
      break;

    default:
      self.postMessage({
        type: 'error',
        payload: {
          code: 'UNKNOWN_ERROR',
          message: `Unknown message type: ${type}`,
        },
      });
  }
};


/**
 * Worker client for model inference
 * Main thread interface to inference worker
 */

import type { ModelRunParams, ModelRunResult } from './types';
import type { Token } from '../viz/types';
import { InferenceError } from './errors';

// Worker instance
let worker: Worker | null = null;
let currentRequestId: string | null = null;
let requestIdCounter = 0;

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

/**
 * Initialize worker
 */
export async function initWorker(
  modelUrl: string,
  preferWebGPU: boolean = true,
  modelVersion: string = '1.0.0'
): Promise<{ ep: 'webgpu' | 'wasm'; loadTimeMs: number }> {
  return new Promise((resolve, reject) => {
    // Create worker if not exists
    if (!worker) {
      worker = new Worker(new URL('../../workers/infer.worker.ts', import.meta.url), {
        type: 'module',
      });

      // Handle worker errors
      worker.onerror = (error) => {
        reject(new InferenceError(`Worker error: ${error.message}`));
      };
    }

    // Set up message handler
    const messageHandler = (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'init_success') {
        worker?.removeEventListener('message', messageHandler);
        resolve({
          ep: payload.ep,
          loadTimeMs: payload.loadTimeMs,
        });
      } else if (type === 'error') {
        worker?.removeEventListener('message', messageHandler);
        reject(
          new InferenceError(
            payload.message || 'Unknown error',
            payload.detail
          )
        );
      }
    };

    worker.addEventListener('message', messageHandler);

    // Send init message
    worker.postMessage({
      type: 'init',
      payload: {
        modelUrl,
        preferWebGPU,
        modelVersion,
      },
    });
  });
}

/**
 * Run inference via worker
 */
export async function runInference(
  inputIds: number[],
  tokens: Token[],
  params: ModelRunParams,
  timeoutMs: number = 30000
): Promise<ModelRunResult> {
  if (!worker) {
    throw new InferenceError('Worker not initialized. Call initWorker() first.');
  }

  // Generate new request ID
  const requestId = generateRequestId();
  currentRequestId = requestId;

  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      // Cancel request
      worker?.postMessage({
        type: 'cancel',
        payload: { requestId },
      });

      // Clear current request
      if (currentRequestId === requestId) {
        currentRequestId = null;
      }

      reject(new InferenceError('Inference timeout'));
    }, timeoutMs);

    // Set up message handler
    const messageHandler = (e: MessageEvent) => {
      const { type, payload } = e.data;

      // Only process messages for current request
      if (payload.requestId !== requestId) {
        return; // Ignore old requests
      }

      if (type === 'result') {
        clearTimeout(timeoutId);
        worker?.removeEventListener('message', messageHandler);

        // Clear current request
        if (currentRequestId === requestId) {
          currentRequestId = null;
        }

        resolve(payload.result);
      } else if (type === 'error') {
        clearTimeout(timeoutId);
        worker?.removeEventListener('message', messageHandler);

        // Clear current request
        if (currentRequestId === requestId) {
          currentRequestId = null;
        }

        reject(
          new InferenceError(
            payload.message || 'Unknown error',
            payload.detail
          )
        );
      }
    };

    worker.addEventListener('message', messageHandler);

    // Send run message
    worker.postMessage({
      type: 'run',
      payload: {
        requestId,
        inputIds,
        tokens,
        params,
      },
    });
  });
}

/**
 * Terminate worker
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    currentRequestId = null;
  }
}


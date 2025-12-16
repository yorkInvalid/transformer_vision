/**
 * ONNX Runtime session management
 * Supports WebGPU with WASM fallback
 */
import * as ort from 'onnxruntime-web';
import { ModelLoadError, EPNotSupportedError } from './errors';

export interface SessionInfo {
  session: ort.InferenceSession;
  executionProvider: 'webgpu' | 'wasm';
  loadTimeMs: number;
}

export interface SessionConfig {
  modelUrl: string;
  preferWebGPU?: boolean;
  inputName?: string;
  outputName?: string;
}

/**
 * Check if WebGPU is available
 */
async function isWebGPUAvailable(): Promise<boolean> {
  if (!('gpu' in navigator)) {
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Create an ONNX Runtime session with WebGPU or WASM fallback
 * @param config - Session configuration
 * @returns Session info with execution provider details
 */
export async function createSession(
  config: SessionConfig
): Promise<SessionInfo> {
  const startTime = performance.now();
  const preferWebGPU = config.preferWebGPU ?? true;

  // Determine execution provider
  let executionProvider: 'webgpu' | 'wasm' = 'wasm';
  const providers: string[] = [];

  if (preferWebGPU) {
    const webgpuAvailable = await isWebGPUAvailable();
    if (webgpuAvailable) {
      executionProvider = 'webgpu';
      providers.push('webgpu');
    }
  }

  // Always include WASM as fallback or primary
  providers.push('wasm');

  // Session options
  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: providers,
    graphOptimizationLevel: 'all',
  };

  try {
    // Load model
    const session = await ort.InferenceSession.create(
      config.modelUrl,
      sessionOptions
    );

    const loadTimeMs = performance.now() - startTime;

    // Determine actual execution provider used
    // Note: ONNX Runtime doesn't expose which EP was actually used,
    // so we infer from whether WebGPU was requested and available
    const actualEP = executionProvider;

    return {
      session,
      executionProvider: actualEP,
      loadTimeMs,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('webgpu') || error.message.includes('WebGPU')) {
        throw new EPNotSupportedError('webgpu', error.message);
      }
      throw new ModelLoadError(`Failed to load model: ${error.message}`, error);
    }
    throw new ModelLoadError('Failed to load model: Unknown error', error as Error);
  }
}


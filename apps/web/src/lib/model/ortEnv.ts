/**
 * ONNX Runtime environment initialization
 * Configures WASM paths and thread settings
 */
import * as ort from 'onnxruntime-web';

/**
 * Initialize ONNX Runtime environment
 * Sets up WASM paths relative to the app base path
 * @param basePath - Base path for the app (e.g., '/' or '/transformer-learning/')
 * 
 * Note: By default, onnxruntime-web will automatically load WASM files from CDN.
 * If you want to use local files, copy them to public/ directory and configure paths here.
 */
export function initOrtEnv(basePath: string = '/'): void {
  // By default, onnxruntime-web uses CDN for WASM files
  // This is the recommended approach for development
  // For production, you can optionally configure local paths:
  
  // Option 1: Use CDN (default - no configuration needed)
  // onnxruntime-web will automatically use CDN URLs
  
  // Option 2: Use local files (uncomment and configure if needed)
  // const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  // ort.env.wasm.wasmPaths = {
  //   'ort-wasm.wasm': `${normalizedBase}ort-wasm.wasm`,
  //   'ort-wasm-simd.wasm': `${normalizedBase}ort-wasm-simd.wasm`,
  //   'ort-wasm-simd-threaded.wasm': `${normalizedBase}ort-wasm-simd-threaded.wasm`,
  //   'ort-wasm-simd-threaded.jsep.wasm': `${normalizedBase}ort-wasm-simd-threaded.jsep.wasm`,
  // };

  // Set thread count (0 = auto-detect)
  ort.env.wasm.numThreads = 0;
}

/**
 * Get the current ORT environment version
 */
export function getOrtVersion(): string {
  return ort.env.versions?.web || 'unknown';
}


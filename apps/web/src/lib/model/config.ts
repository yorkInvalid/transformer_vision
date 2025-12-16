/**
 * Model configuration
 * Centralized configuration for model paths and tensor names
 * Supports environment variables for flexible deployment
 */

/**
 * Get model URL from environment variable or default
 * Supports:
 * - VITE_MODEL_URL: Full URL or relative path
 * - VITE_MODEL_VERSION: Version string for cache busting
 * @param basePath - App base path (for GitHub Pages deployment)
 */
export function getModelUrl(basePath: string = '/'): string {
  // Check environment variable first
  const envModelUrl = import.meta.env.VITE_MODEL_URL;
  if (envModelUrl) {
    // If it's already a full URL, return as-is
    if (envModelUrl.startsWith('http://') || envModelUrl.startsWith('https://')) {
      return envModelUrl;
    }
    // Otherwise treat as relative path
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const normalizedModelPath = envModelUrl.startsWith('/') ? envModelUrl.slice(1) : envModelUrl;
    return `${normalizedBase}${normalizedModelPath}`;
  }

  // Fallback to default path
  const defaultPath = 'models/gpt2/model.onnx';
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBase}${defaultPath}`;
}

/**
 * Get model version from environment variable or default
 */
export function getModelVersion(): string {
  return import.meta.env.VITE_MODEL_VERSION || '1.0.0';
}

/**
 * Get tokenizer base URL
 */
export function getTokenizerBaseUrl(basePath: string = '/'): string {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return normalizedBase;
}

/**
 * Default model configuration
 * 
 * Note: Vite serves files from the 'public' directory at the root path.
 * So 'models/gpt2/model.onnx' in public/ becomes '/models/gpt2/model.onnx' at runtime.
 */
export const DEFAULT_MODEL_CONFIG = {
  // Model path is now resolved via getModelUrl()
  inputName: 'input_ids', // Common names: 'input_ids', 'input', 'ids'
  outputName: 'logits', // Common names: 'logits', 'output', 'output_logits'
  preferWebGPU: true,
};

/**
 * Default tokenizer configuration
 */
export const DEFAULT_TOKENIZER_CONFIG = {
  // Option 1: Use vocab.json + merges.txt
  vocabPath: 'models/gpt2/vocab.json',
  mergesPath: 'models/gpt2/merges.txt',

  // Option 2: Use tokenizer.json (alternative)
  // If provided, vocabPath and mergesPath will be ignored
  tokenizerPath: undefined as string | undefined,

  // Loader options
  useCacheStorage: true,
  cacheVersion: '1',
};


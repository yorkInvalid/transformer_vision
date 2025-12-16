/**
 * Model configuration
 * Centralized configuration for model paths and tensor names
 */

/**
 * Get model URL
 * Supports local static files and future CDN URLs
 * @param modelPath - Relative path from static/ or full URL
 * @param basePath - App base path (for GitHub Pages deployment)
 */
export function getModelUrl(modelPath: string, basePath: string = '/'): string {
  // If it's already a full URL, return as-is
  if (modelPath.startsWith('http://') || modelPath.startsWith('https://')) {
    return modelPath;
  }

  // Normalize base path
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

  // Remove leading slash from modelPath if present
  const normalizedModelPath = modelPath.startsWith('/') ? modelPath.slice(1) : modelPath;

  // For now, assume models are in static/models/
  // In production, this could be a CDN URL
  return `${normalizedBase}${normalizedModelPath}`;
}

/**
 * Default model configuration
 * TODO: Replace with actual model path when model is available
 * 
 * Note: Vite serves files from the 'public' directory at the root path.
 * So 'models/demo/model.onnx' in public/ becomes '/models/demo/model.onnx' at runtime.
 */
export const DEFAULT_MODEL_CONFIG = {
  // Placeholder path - replace with actual model path
  // This path is relative to the public/ directory
  modelPath: 'models/demo/model.onnx',
  inputName: 'input_ids', // Common names: 'input_ids', 'input', 'ids'
  outputName: 'logits', // Common names: 'logits', 'output', 'output_logits'
  preferWebGPU: true,
};


/**
 * Unified error types for ONNX inference
 */

export class ModelLoadError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export class EPNotSupportedError extends Error {
  constructor(
    public readonly requestedEP: string,
    message?: string
  ) {
    super(message || `Execution provider '${requestedEP}' is not supported`);
    this.name = 'EPNotSupportedError';
  }
}

export class InferenceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'InferenceError';
  }
}


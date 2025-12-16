# ONNX Inference Implementation

## Overview

This document describes the ONNX Runtime Web inference implementation for browser-side token generation.

## Architecture

### Module Structure

```
apps/web/src/lib/model/
├── errors.ts              # Error type definitions
├── ortEnv.ts              # ONNX Runtime environment initialization
├── session.ts             # Session management (WebGPU/WASM fallback)
├── run.ts                 # Inference execution (logits extraction)
├── sampling.ts            # Sampling utilities (softmax, top-k, top-p)
├── config.ts              # Model configuration
└── inferenceService.ts    # High-level inference orchestration
```

### State Management

```
apps/web/src/lib/state/
└── inferenceStore.ts      # Inference state (session, generation, metrics)
```

## Implementation Details

### 1. Environment Initialization (`ortEnv.ts`)

- Configures WASM paths relative to app base path
- Supports GitHub Pages deployment with configurable base path
- Sets thread count (auto-detect)

### 2. Session Management (`session.ts`)

- **WebGPU Detection**: Checks `navigator.gpu` availability
- **Fallback Strategy**: WebGPU → WASM (automatic)
- **Session Info**: Returns execution provider and load time

### 3. Inference Execution (`run.ts`)

- **Input**: Token IDs (number[] or Int32Array)
- **Output**: Logits (Float32Array) - last token's logits
- **Tensor Names**: Configurable (defaults: `input_ids`, `logits`)
- **Shape Handling**: Supports 1D, 2D, and 3D logits shapes

### 4. Sampling (`sampling.ts`)

- **Stable Softmax**: Log-sum-exp trick for numerical stability
- **Temperature Scaling**: Applied before softmax
- **Top-K Filtering**: Keeps top K tokens, renormalizes
- **Top-P (Nucleus) Filtering**: Cumulative probability threshold
- **Sampling**: Categorical sampling from probability distribution

### 5. Inference Service (`inferenceService.ts`)

- **Model Loading**: Async model loading with error handling
- **Token Generation**: End-to-end pipeline:
  1. Encode input text → token IDs
  2. Run inference → logits
  3. Apply temperature + softmax → probabilities
  4. Apply filtering (top-k/top-p) → filtered probabilities
  5. Sample → token ID
  6. Decode token ID → text

## Resource Strategy

### Model Files

- **Default Path**: `models/demo/model.onnx` (relative to static/)
- **Configuration**: `apps/web/src/lib/model/config.ts`
- **CDN Support**: `getModelUrl()` supports full URLs for future CDN deployment

### WASM Files

- Automatically resolved from `node_modules/onnxruntime-web/dist/`
- Paths configured in `ortEnv.ts` based on app base path

## UI Integration

### TopControlBar Component

- **Generate Button**: Triggers model loading (if needed) and token generation
- **Status Display**:
  - Execution Provider (webgpu/wasm)
  - Model load time
  - Last inference time
  - Error messages
- **Output Display**: Shows generated text

### State Flow

1. User clicks "Generate"
2. If session not loaded → load model (show loading state)
3. Run inference → generate next token
4. Append token to output text
5. Update performance metrics

## Configuration

### Model Configuration

Edit `apps/web/src/lib/model/config.ts`:

```typescript
export const DEFAULT_MODEL_CONFIG = {
  modelPath: 'models/demo/model.onnx',
  inputName: 'input_ids',
  outputName: 'logits',
  preferWebGPU: true,
};
```

### Base Path

Set via environment variable or Vite config:

```bash
VITE_BASE_PATH=/transformer-learning/ npm run build
```

## Error Handling

### Error Types

- **ModelLoadError**: Model file loading failed
- **EPNotSupportedError**: Execution provider not supported
- **InferenceError**: Inference execution failed

### Error Display

- Errors shown in status bar
- Auto-dismiss after 5 seconds
- Stored in `inferenceStore.error`

## Performance Metrics

Tracked in `inferenceStore`:

- `modelLoadTimeMs`: Time to load model
- `lastInferenceTimeMs`: Time for last inference
- `totalInferenceTimeMs`: Cumulative inference time

## Testing & Validation

### Sampling Validation

Run in browser console:

```javascript
import { samplingValidation } from './lib/model/sampling';

// Test softmax
samplingValidation.testSoftmax();

// Test top-k
samplingValidation.testTopK();

// Test top-p
samplingValidation.testTopP();

// Test sampling
samplingValidation.testSampling();
```

### WebGPU Fallback Testing

1. **Disable WebGPU**: Use browser without WebGPU support (or disable in DevTools)
2. **Verify Fallback**: Check status bar shows "wasm" as EP
3. **Verify Functionality**: Generation should still work

### Timing Verification

- Check status bar for load/inference times
- Use browser DevTools Performance tab for detailed profiling

## Limitations & TODOs

### Current Limitations

1. **Tokenizer**: Uses simple character-level tokenizer (placeholder)
   - TODO: Integrate actual model tokenizer (e.g., from transformers.js)

2. **Single Token Generation**: Generates one token per click
   - TODO: Implement multi-token generation loop

3. **Model Path**: Placeholder path (`models/demo/model.onnx`)
   - TODO: Add actual model file or update path

### Future Enhancements

- Multi-token generation with stopping criteria
- Proper tokenizer integration
- Model quantization support
- Batch inference
- Streaming output

## Dependencies

- `onnxruntime-web`: ^1.20.0
- `svelte`: ^5.0.0 (for stores)

## References

- [ONNX Runtime Web Docs](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
- [WebGPU Execution Provider](https://onnxruntime.ai/docs/execution-providers/WebGPU-ExecutionProvider.html)
- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)


/**
 * ONNX Runtime inference execution
 * Runs model inference and returns logits
 */
import * as ort from 'onnxruntime-web';
import type { InferenceSession } from 'onnxruntime-web';
import { InferenceError } from './errors';

export interface RunConfig {
  inputName?: string;
  outputName?: string;
}

/**
 * Get default input/output tensor names from session metadata
 * Falls back to common naming conventions if metadata is unavailable
 */
function getTensorNames(
  session: InferenceSession,
  config: RunConfig
): { inputName: string; outputName: string } {
  const inputNames = session.inputNames;
  const outputNames = session.outputNames;

  const inputName =
    config.inputName ||
    inputNames[0] ||
    'input_ids' ||
    'input' ||
    'ids';

  const outputName =
    config.outputName ||
    outputNames[0] ||
    'logits' ||
    'output' ||
    'output_logits';

  return { inputName, outputName };
}

/**
 * Run inference and return logits
 * @param session - ONNX Runtime inference session
 * @param inputIds - Input token IDs (1D array of integers)
 * @param config - Optional configuration for tensor names
 * @returns Logits as Float32Array (vocab_size,)
 */
export async function runLogits(
  session: InferenceSession,
  inputIds: number[] | Int32Array | BigInt64Array,
  config: RunConfig = {}
): Promise<Float32Array> {
  try {
    const { inputName, outputName } = getTensorNames(session, config);

    // Convert input to tensor
    // Shape: [batch_size, sequence_length] or [sequence_length]
    const inputShape = [1, inputIds.length];
    const inputTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), inputShape);

    // Run inference
    const feeds = { [inputName]: inputTensor };
    const results = await session.run(feeds);

    // Extract logits
    const outputTensor = results[outputName];
    if (!outputTensor) {
      throw new InferenceError(
        `Output tensor '${outputName}' not found. Available outputs: ${Object.keys(results).join(', ')}`
      );
    }

    // Convert to Float32Array
    // Logits shape is typically [batch_size, sequence_length, vocab_size]
    // We want the last token's logits: [vocab_size]
    const logitsData = outputTensor.data as Float32Array;
    const logitsShape = outputTensor.dims;

    if (logitsShape.length === 3) {
      // [batch, seq_len, vocab_size] -> take last token
      const batchSize = logitsShape[0];
      const seqLen = logitsShape[1];
      const vocabSize = logitsShape[2];
      const lastTokenOffset = (batchSize - 1) * seqLen * vocabSize + (seqLen - 1) * vocabSize;
      return logitsData.slice(lastTokenOffset, lastTokenOffset + vocabSize);
    } else if (logitsShape.length === 2) {
      // [seq_len, vocab_size] -> take last token
      const seqLen = logitsShape[0];
      const vocabSize = logitsShape[1];
      const lastTokenOffset = (seqLen - 1) * vocabSize;
      return logitsData.slice(lastTokenOffset, lastTokenOffset + vocabSize);
    } else if (logitsShape.length === 1) {
      // [vocab_size] -> already correct
      return logitsData;
    } else {
      throw new InferenceError(
        `Unexpected logits shape: [${logitsShape.join(', ')}]. Expected 1D, 2D, or 3D.`
      );
    }
  } catch (error) {
    if (error instanceof InferenceError) {
      throw error;
    }
    throw new InferenceError(
      `Inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error as Error
    );
  }
}


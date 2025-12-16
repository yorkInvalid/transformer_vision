/**
 * Sampling utilities for token generation
 * Implements stable softmax, top-k, top-p (nucleus), and sampling
 */

/**
 * Stable softmax with temperature scaling
 * Uses log-sum-exp trick for numerical stability
 * @param logits - Raw logits from model
 * @param temperature - Temperature parameter (0 < temp <= inf, 1.0 = no scaling)
 * @returns Probability distribution (normalized, sums to 1)
 */
export function stableSoftmax(logits: Float32Array | number[], temperature: number): Float32Array {
  if (temperature <= 0) {
    throw new Error('Temperature must be positive');
  }

  const arr = logits instanceof Float32Array ? Array.from(logits) : logits;
  const n = arr.length;

  // Apply temperature scaling
  const scaled = arr.map((x) => x / temperature);

  // Find maximum for numerical stability (log-sum-exp trick)
  const maxLogit = Math.max(...scaled);

  // Compute exp(x - max) and sum
  let sum = 0;
  const exps = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const expVal = Math.exp(scaled[i] - maxLogit);
    exps[i] = expVal;
    sum += expVal;
  }

  // Normalize
  if (sum === 0 || !isFinite(sum)) {
    // Fallback: uniform distribution
    const uniform = 1 / n;
    return new Float32Array(n).fill(uniform);
  }

  for (let i = 0; i < n; i++) {
    exps[i] /= sum;
  }

  return exps;
}

/**
 * Top-K filtering: keep only top K tokens by probability
 * @param probs - Probability distribution
 * @param k - Number of top tokens to keep
 * @returns Filtered probabilities (others set to 0)
 */
export function topKFilter(probs: Float32Array, k: number): Float32Array {
  if (k <= 0 || k > probs.length) {
    return probs.slice(); // Return copy if k is invalid
  }

  const filtered = new Float32Array(probs.length);

  // Create array of [index, probability] pairs
  const indexed = Array.from(probs)
    .map((prob, idx) => [idx, prob] as [number, number])
    .sort((a, b) => b[1] - a[1]); // Sort descending by probability

  // Keep top K
  for (let i = 0; i < k; i++) {
    const [idx] = indexed[i];
    filtered[idx] = probs[idx];
  }

  // Renormalize
  const sum = Array.from(filtered).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < filtered.length; i++) {
      filtered[i] /= sum;
    }
  }

  return filtered;
}

/**
 * Top-P (nucleus) filtering: keep tokens until cumulative probability reaches p
 * @param probs - Probability distribution
 * @param p - Cumulative probability threshold (0 < p <= 1)
 * @returns Filtered probabilities (others set to 0)
 */
export function nucleusTopPFilter(probs: Float32Array, p: number): Float32Array {
  if (p <= 0 || p > 1) {
    return probs.slice(); // Return copy if p is invalid
  }

  const filtered = new Float32Array(probs.length);

  // Create array of [index, probability] pairs and sort descending
  const indexed = Array.from(probs)
    .map((prob, idx) => [idx, prob] as [number, number])
    .sort((a, b) => b[1] - a[1]);

  // Accumulate probabilities until threshold
  let cumsum = 0;
  for (const [idx, prob] of indexed) {
    cumsum += prob;
    filtered[idx] = prob;
    if (cumsum >= p) {
      break;
    }
  }

  // Renormalize
  const sum = Array.from(filtered).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < filtered.length; i++) {
      filtered[i] /= sum;
    }
  }

  return filtered;
}

/**
 * Sample a token index from a probability distribution
 * @param probs - Probability distribution (must sum to 1)
 * @param rng - Optional random number generator (default: Math.random)
 * @returns Sampled token index
 */
export function sampleFromProbs(
  probs: Float32Array | number[],
  rng: () => number = Math.random
): number {
  const arr = probs instanceof Float32Array ? Array.from(probs) : probs;
  const r = rng();

  // Cumulative distribution sampling
  let cumsum = 0;
  for (let i = 0; i < arr.length; i++) {
    cumsum += arr[i];
    if (r <= cumsum) {
      return i;
    }
  }

  // Fallback: return last index (shouldn't happen if probs sum to 1)
  return arr.length - 1;
}

/**
 * Unit-level validation helpers (for browser console testing)
 */
export const samplingValidation = {
  /**
   * Test softmax: should sum to 1 and handle extreme values
   */
  testSoftmax() {
    const logits = new Float32Array([1, 2, 3, 4, 5]);
    const probs = stableSoftmax(logits, 1.0);
    const sum = Array.from(probs).reduce((a, b) => a + b, 0);
    console.log('Softmax test:', {
      input: Array.from(logits),
      output: Array.from(probs),
      sum: sum,
      isValid: Math.abs(sum - 1) < 1e-6 && probs.every((p) => p >= 0 && p <= 1),
    });
    return Math.abs(sum - 1) < 1e-6;
  },

  /**
   * Test top-k: should keep only k non-zero values
   */
  testTopK() {
    const probs = new Float32Array([0.1, 0.2, 0.3, 0.15, 0.25]);
    const filtered = topKFilter(probs, 3);
    const nonZeroCount = Array.from(filtered).filter((p) => p > 0).length;
    const sum = Array.from(filtered).reduce((a, b) => a + b, 0);
    console.log('Top-K test:', {
      input: Array.from(probs),
      output: Array.from(filtered),
      nonZeroCount,
      sum: sum,
      isValid: nonZeroCount === 3 && Math.abs(sum - 1) < 1e-6,
    });
    return nonZeroCount === 3 && Math.abs(sum - 1) < 1e-6;
  },

  /**
   * Test top-p: should keep tokens until cumulative prob >= p
   */
  testTopP() {
    const probs = new Float32Array([0.1, 0.2, 0.3, 0.15, 0.25]);
    const filtered = nucleusTopPFilter(probs, 0.7);
    const sum = Array.from(filtered).reduce((a, b) => a + b, 0);
    console.log('Top-P test:', {
      input: Array.from(probs),
      output: Array.from(filtered),
      sum: sum,
    });
    return Math.abs(sum - 1) < 1e-6;
  },

  /**
   * Test sampling: should return valid index
   */
  testSampling() {
    const probs = new Float32Array([0.1, 0.2, 0.3, 0.15, 0.25]);
    const sampled = sampleFromProbs(probs);
    console.log('Sampling test:', {
      probs: Array.from(probs),
      sampledIndex: sampled,
      isValid: sampled >= 0 && sampled < probs.length,
    });
    return sampled >= 0 && sampled < probs.length;
  },
};


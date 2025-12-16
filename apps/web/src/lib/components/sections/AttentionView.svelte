<script lang="ts">
  import AttentionMatrix from '../AttentionMatrix.svelte';
  import type { Token, AttentionTensor } from '../../viz/types';
  import { modelStore } from '../../state/modelStore';
  import { get } from 'svelte/store';

  // Convert activations to AttentionTensor format
  function activationsToTensor(activations: any, layerIndex: number, numHeads: number, seqLen: number): AttentionTensor | null {
    const layer = activations.layers.find((l: any) => l.layerIndex === layerIndex);
    if (!layer || !layer.attnProbs) {
      return null;
    }

    // attnProbs shape: [num_heads, seq_len, seq_len] or [batch, num_heads, seq_len, seq_len]
    const attnData = layer.attnProbs;
    const tensor: AttentionTensor = [];

    // Handle different shapes
    if (attnData.length === numHeads * seqLen * seqLen) {
      // Flattened array: [num_heads * seq_len * seq_len]
      for (let h = 0; h < numHeads; h++) {
        const headMatrix: number[][] = [];
        for (let i = 0; i < seqLen; i++) {
          const row: number[] = [];
          for (let j = 0; j < seqLen; j++) {
            const idx = h * seqLen * seqLen + i * seqLen + j;
            row.push(attnData[idx]);
          }
          headMatrix.push(row);
        }
        tensor.push(headMatrix);
      }
    } else {
      // Already in correct format (shouldn't happen with Float32Array, but handle it)
      console.warn('Unexpected attnProbs format');
      return null;
    }

    return tensor;
  }

  // Get tokens and attention data from modelStore
  $: lastResult = $modelStore.lastResult;
  $: tokens = (lastResult?.tokens || []) as Token[];
  $: attentionTensor = lastResult?.activations
    ? (() => {
        const numHeads = 12; // Default, should be inferred from model
        const seqLen = tokens.length;
        if (seqLen === 0) return null;
        
        // Try to get the last layer's activations
        const layers = lastResult.activations.layers;
        if (layers.length === 0) return null;
        
        const lastLayerIndex = layers[layers.length - 1].layerIndex;
        return activationsToTensor(lastResult.activations, lastLayerIndex, numHeads, seqLen);
      })()
    : null as AttentionTensor | null;

  // Fallback to demo data if no real data
  const demoTokens: Token[] = [
    { id: 't0', text: 'The' },
    { id: 't1', text: 'quick' },
    { id: 't2', text: 'brown' },
    { id: 't3', text: 'fox' },
    { id: 't4', text: 'jumps' },
    { id: 't5', text: 'over' },
    { id: 't6', text: 'the' },
    { id: 't7', text: 'lazy' },
    { id: 't8', text: 'dog' }
  ];

  function generateAttentionTensor(numHeads: number, seqLen: number): AttentionTensor {
    const tensor: AttentionTensor = [];
    for (let h = 0; h < numHeads; h++) {
      const headMatrix: number[][] = [];
      for (let i = 0; i < seqLen; i++) {
        const row: number[] = [];
        for (let j = 0; j < seqLen; j++) {
          let value: number;
          if (i === j) {
            value = 0.8 + Math.random() * 0.2;
          } else {
            const distance = Math.abs(i - j);
            const baseValue = Math.exp(-distance / (seqLen / 2));
            const headBias = Math.sin((h * Math.PI) / numHeads) * 0.3;
            value = baseValue * (0.3 + Math.random() * 0.4) + headBias;
            value = Math.max(0, Math.min(1, value));
          }
          row.push(value);
        }
        headMatrix.push(row);
      }
      tensor.push(headMatrix);
    }
    return tensor;
  }

  $: displayTokens = tokens.length > 0 ? tokens : demoTokens;
  $: displayTensor = attentionTensor || generateAttentionTensor(12, displayTokens.length);
  $: hasRealData = attentionTensor !== null;
</script>

<section id="attention" class="scroll-mt-20">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-6">
      <h2 class="mb-2 text-3xl font-bold tracking-tight text-slate-50">Multi-Head Attention</h2>
      <p class="text-slate-400">
        Attention mechanisms allow the model to focus on different parts of the input sequence,
        computing relationships between all token pairs.
      </p>
      {#if !hasRealData}
        <div class="mt-2 rounded-lg border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-200">
          ⚠️ Showing demo data. Run inference to see real attention patterns.
        </div>
      {:else}
        <div class="mt-2 rounded-lg border border-green-800 bg-green-900/20 px-3 py-2 text-sm text-green-200">
          ✓ Showing real attention data from model inference.
        </div>
      {/if}
    </div>

    <!-- Attention Matrix Visualization (Canvas) -->
    <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-50">Interactive Attention Matrix</h3>
      <p class="mb-4 text-sm text-slate-400">
        Hover over cells to see attention weights. Switch between heads to explore different
        attention patterns. Each head learns to focus on different aspects of relationships between
        tokens.
      </p>
      <div class="min-h-[500px]">
        <AttentionMatrix
          tokens={displayTokens}
          attn={displayTensor}
          initialHead={0}
          showValuesOnHover={true}
        />
      </div>
    </div>

    <!-- Multi-Head Explanation -->
    <div class="grid gap-6 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Attention Heads</h3>
        <p class="mb-4 text-sm text-slate-300">
          This model uses {displayTensor.length} parallel attention heads, each learning different aspects
          of relationships between tokens.
        </p>
        <div class="flex flex-wrap gap-2">
          {#each Array(displayTensor.length) as _, i}
            <div
              class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300"
            >
              Head {i + 1}
            </div>
          {/each}
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Query, Key, Value</h3>
        <p class="text-sm leading-relaxed text-slate-300">
          Each attention head computes three projections: Query (Q), Key (K), and Value (V). The
          attention scores are computed as QK<sup>T</sup>, then applied to V to produce the output.
        </p>
      </div>
    </div>

    <!-- Explanation Card -->
    <div class="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div class="mb-3 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-sky-400" />
        <h3 class="text-lg font-semibold text-slate-50">Why Attention Matters</h3>
      </div>
      <p class="text-sm leading-relaxed text-slate-300">
        Self-attention allows each position in the sequence to attend to all other positions,
        enabling the model to capture long-range dependencies and contextual relationships. This is
        a key innovation that makes transformers effective for understanding language.
      </p>
    </div>
  </div>
</section>

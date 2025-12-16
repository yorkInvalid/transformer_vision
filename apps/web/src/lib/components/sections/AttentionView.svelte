<script lang="ts">
  // Placeholder data for Attention section
  const attentionData = {
    numHeads: 12,
    sequenceLength: 4,
    tokens: ['The', 'quick', 'brown', 'fox'],
    attentionMatrix: [
      [1.0, 0.3, 0.1, 0.05],
      [0.2, 1.0, 0.4, 0.1],
      [0.1, 0.3, 1.0, 0.2],
      [0.05, 0.1, 0.3, 1.0]
    ]
  };
</script>

<section id="attention" class="scroll-mt-20">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-6">
      <h2 class="mb-2 text-3xl font-bold tracking-tight text-slate-50">Multi-Head Attention</h2>
      <p class="text-slate-400">
        Attention mechanisms allow the model to focus on different parts of the input sequence,
        computing relationships between all token pairs.
      </p>
    </div>

    <!-- Attention Matrix Visualization -->
    <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-50">Attention Weights Matrix</h3>
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full">
          <!-- Header row -->
          <div class="mb-2 flex">
            <div class="w-20 flex-shrink-0" />
            {#each attentionData.tokens as token}
              <div class="flex-1 text-center text-xs font-medium text-slate-400">{token}</div>
            {/each}
          </div>
          <!-- Matrix rows -->
          {#each attentionData.attentionMatrix as row, i}
            <div class="mb-1 flex items-center">
              <div class="w-20 flex-shrink-0 text-xs font-medium text-slate-400">
                {attentionData.tokens[i]}
              </div>
              {#each row as weight, j}
                <div
                  class="flex-1 rounded border border-slate-700 bg-slate-800 p-2 text-center text-xs font-mono"
                  style="background-color: rgba(56, 189, 248, {weight});"
                >
                  {weight.toFixed(2)}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
      <p class="mt-4 text-xs text-slate-400">
        Each cell represents the attention weight from one token (row) to another (column). Higher
        values indicate stronger attention.
      </p>
    </div>

    <!-- Multi-Head Explanation -->
    <div class="grid gap-6 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Attention Heads</h3>
        <p class="mb-4 text-sm text-slate-300">
          This model uses {attentionData.numHeads} parallel attention heads, each learning different
          aspects of relationships between tokens.
        </p>
        <div class="flex flex-wrap gap-2">
          {#each Array(attentionData.numHeads) as _, i}
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


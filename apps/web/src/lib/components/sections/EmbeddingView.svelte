<script lang="ts">
  // Placeholder data for Embedding section
  const embeddingData = {
    tokens: ['The', 'quick', 'brown', 'fox'],
    embeddingDim: 768,
    visualization: {
      width: 400,
      height: 200
    }
  };

  // Placeholder visualization data
  const chartData = Array.from({ length: 20 }, (_, i) => ({
    x: i,
    y: Math.sin(i * 0.3) * 50 + 100
  }));
</script>

<section id="embedding" class="scroll-mt-20 bg-slate-900/30">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-6">
      <h2 class="mb-2 text-3xl font-bold tracking-tight text-slate-50">Token Embeddings</h2>
      <p class="text-slate-400">
        Input tokens are converted into dense vector representations in a {embeddingData.embeddingDim}
        -dimensional space.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <!-- Token List -->
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-4 text-lg font-semibold text-slate-50">Input Tokens</h3>
        <div class="flex flex-wrap gap-2">
          {#each embeddingData.tokens as token}
            <span
              class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-mono text-slate-200"
            >
              {token}
            </span>
          {/each}
        </div>
        <p class="mt-4 text-xs text-slate-400">
          Each token is mapped to a learnable embedding vector of dimension {embeddingData.embeddingDim}
          .
        </p>
      </div>

      <!-- Placeholder Visualization -->
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-4 text-lg font-semibold text-slate-50">Embedding Visualization</h3>
        <div
          class="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950/60"
          style="height: {embeddingData.visualization.height}px;"
        >
          <div class="text-center text-sm text-slate-500">
            <svg
              class="mx-auto mb-2 h-12 w-12 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p>Embedding visualization</p>
            <p class="text-xs">(Placeholder for d3 chart)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Explanation Card -->
    <div class="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div class="mb-3 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-sky-400" />
        <h3 class="text-lg font-semibold text-slate-50">How Embeddings Work</h3>
      </div>
      <p class="text-sm leading-relaxed text-slate-300">
        Token embeddings convert discrete tokens into continuous vectors. These vectors capture
        semantic relationships and are learned during training. The embedding layer acts as a lookup
        table, mapping each token ID to its corresponding {embeddingData.embeddingDim}
        -dimensional vector.
      </p>
    </div>
  </div>
</section>


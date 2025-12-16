<script lang="ts">
  // Placeholder data for MLP section
  const mlpData = {
    hiddenSize: 3072,
    intermediateSize: 3072,
    activation: 'GELU',
    layers: ['Linear', 'Activation', 'Linear']
  };
</script>

<section id="mlp" class="scroll-mt-20 bg-slate-900/30">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-6">
      <h2 class="mb-2 text-3xl font-bold tracking-tight text-slate-50">Feed-Forward Network (MLP)</h2>
      <p class="text-slate-400">
        After attention, each token's representation is processed through a multi-layer perceptron
        (MLP) to add non-linearity and increase model capacity.
      </p>
    </div>

    <!-- MLP Architecture Visualization -->
    <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-50">MLP Architecture</h3>
      <div class="flex items-center justify-center gap-4">
        {#each mlpData.layers as layer, i}
          <div class="flex flex-col items-center">
            <div
              class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200"
            >
              {layer}
            </div>
            {#if i < mlpData.layers.length - 1}
              <svg
                class="my-2 h-6 w-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            {/if}
          </div>
        {/each}
      </div>
      <p class="mt-4 text-xs text-slate-400">
        The MLP consists of two linear transformations with a {mlpData.activation} activation
        function in between.
      </p>
    </div>

    <!-- MLP Details -->
    <div class="grid gap-6 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Layer Dimensions</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-400">Input:</span>
            <span class="font-mono text-slate-200">768</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Hidden:</span>
            <span class="font-mono text-slate-200">{mlpData.hiddenSize}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Output:</span>
            <span class="font-mono text-slate-200">768</span>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Activation Function</h3>
        <div class="mb-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-center">
          <span class="font-mono text-lg font-semibold text-sky-400">{mlpData.activation}</span>
        </div>
        <p class="text-xs text-slate-400">
          Gaussian Error Linear Unit (GELU) is commonly used in transformer models for smooth,
          differentiable activation.
        </p>
      </div>
    </div>

    <!-- Explanation Card -->
    <div class="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div class="mb-3 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-sky-400" />
        <h3 class="text-lg font-semibold text-slate-50">Role of the MLP</h3>
      </div>
      <p class="text-sm leading-relaxed text-slate-300">
        The feed-forward network applies a point-wise transformation to each token independently. It
        expands the representation to {mlpData.hiddenSize} dimensions, applies non-linear
        activation, then projects back to the original dimension. This adds model capacity and
        allows the network to learn complex feature transformations.
      </p>
    </div>
  </div>
</section>


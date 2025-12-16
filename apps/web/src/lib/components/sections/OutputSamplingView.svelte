<script lang="ts">
  import { appState } from '../../state/index';

  // Placeholder data for Output/Sampling section
  const outputData = {
    vocabSize: 50257,
    topCandidates: [
      { token: 'jumps', probability: 0.35, logit: 2.1 },
      { token: 'runs', probability: 0.28, logit: 1.8 },
      { token: 'walks', probability: 0.15, logit: 1.2 },
      { token: 'moves', probability: 0.12, logit: 1.0 },
      { token: 'goes', probability: 0.10, logit: 0.8 }
    ]
  };
</script>

<section id="output" class="scroll-mt-20">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-6">
      <h2 class="mb-2 text-3xl font-bold tracking-tight text-slate-50">Output & Sampling</h2>
      <p class="text-slate-400">
        The final layer produces logits over the vocabulary. Sampling strategies control how tokens
        are selected from this distribution.
      </p>
    </div>

    <!-- Top Candidates Visualization -->
    <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-50">Top Token Candidates</h3>
      <div class="space-y-2">
        {#each outputData.topCandidates as candidate}
          <div class="flex items-center gap-3">
            <div class="w-20 text-xs font-mono text-slate-400">{candidate.token}</div>
            <div class="flex-1">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-slate-400">Probability: {(candidate.probability * 100).toFixed(1)}%</span>
                <span class="font-mono text-slate-400">Logit: {candidate.logit.toFixed(2)}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  class="h-full bg-gradient-to-r from-sky-500 to-sky-400"
                  style="width: {candidate.probability * 100}%"
                />
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Sampling Strategy Info -->
    <div class="grid gap-6 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Current Settings</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-400">Sampling Mode:</span>
            <span class="font-mono text-slate-200">{$appState.samplingMode}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Temperature:</span>
            <span class="font-mono text-slate-200">{$appState.temperature.toFixed(2)}</span>
          </div>
          {#if $appState.samplingMode === 'top-k'}
            <div class="flex justify-between">
              <span class="text-slate-400">Top-K:</span>
              <span class="font-mono text-slate-200">{$appState.topK}</span>
            </div>
          {:else}
            <div class="flex justify-between">
              <span class="text-slate-400">Top-P:</span>
              <span class="font-mono text-slate-200">{$appState.topP.toFixed(2)}</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Sampling Methods</h3>
        <div class="space-y-3 text-sm text-slate-300">
          <div>
            <div class="mb-1 font-medium text-slate-200">Top-K Sampling</div>
            <p class="text-xs text-slate-400">
              Selects from the K tokens with highest probabilities. Reduces randomness while
              maintaining diversity.
            </p>
          </div>
          <div>
            <div class="mb-1 font-medium text-slate-200">Top-P (Nucleus) Sampling</div>
            <p class="text-xs text-slate-400">
              Selects from the smallest set of tokens whose cumulative probability exceeds P. More
              adaptive than Top-K.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Explanation Card -->
    <div class="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div class="mb-3 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-sky-400" />
        <h3 class="text-lg font-semibold text-slate-50">From Logits to Tokens</h3>
      </div>
      <p class="text-sm leading-relaxed text-slate-300">
        The output layer produces logits (unnormalized scores) for all {outputData.vocabSize}
        tokens in the vocabulary. These are converted to probabilities via softmax, then sampled
        according to the chosen strategy. Temperature scaling controls the sharpness of the
        distribution: lower values make the model more confident, higher values increase
        randomness.
      </p>
    </div>
  </div>
</section>


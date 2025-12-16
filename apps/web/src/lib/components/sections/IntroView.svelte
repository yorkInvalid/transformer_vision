<script lang="ts">
  import OverviewFlow from '../OverviewFlow.svelte';
  import type { FlowGraph } from '../../viz/types';

  // Placeholder data for Intro section
  const introData = {
    title: 'Understanding Transformers',
    description:
      'Explore how transformer models process text through embeddings, attention mechanisms, and feed-forward networks.',
    stats: [
      { label: 'Layers', value: '12' },
      { label: 'Heads', value: '12' },
      { label: 'Dimensions', value: '768' }
    ]
  };

  // Demo data for OverviewFlow
  const demoGraph: FlowGraph = {
    tokens: [
      { id: 't0', text: 'The' },
      { id: 't1', text: 'quick' },
      { id: 't2', text: 'brown' },
      { id: 't3', text: 'fox' },
      { id: 't4', text: 'jumps' },
      { id: 't5', text: 'over' },
      { id: 't6', text: 'the' },
      { id: 't7', text: 'lazy' },
      { id: 't8', text: 'dog' }
    ],
    nodes: [
      // Token nodes
      { id: 't0', kind: 'token', layer: 0 },
      { id: 't1', kind: 'token', layer: 0 },
      { id: 't2', kind: 'token', layer: 0 },
      { id: 't3', kind: 'token', layer: 0 },
      { id: 't4', kind: 'token', layer: 0 },
      { id: 't5', kind: 'token', layer: 0 },
      { id: 't6', kind: 'token', layer: 0 },
      { id: 't7', kind: 'token', layer: 0 },
      { id: 't8', kind: 'token', layer: 0 },
      // Attention nodes
      { id: 'att0', kind: 'attention', layer: 0 },
      { id: 'att1', kind: 'attention', layer: 1 },
      // MLP nodes
      { id: 'mlp0', kind: 'mlp', layer: 0 },
      { id: 'mlp1', kind: 'mlp', layer: 1 },
      // Output nodes
      { id: 'out0', kind: 'output', layer: 0 },
      { id: 'out1', kind: 'output', layer: 1 }
    ],
    links: [
      // Token to attention
      { id: 'l-t0-att0', source: 't0', target: 'att0', tokenId: 't0', weight: 0.8 },
      { id: 'l-t1-att0', source: 't1', target: 'att0', tokenId: 't1', weight: 0.9 },
      { id: 'l-t2-att0', source: 't2', target: 'att0', tokenId: 't2', weight: 0.7 },
      { id: 'l-t3-att0', source: 't3', target: 'att0', tokenId: 't3', weight: 0.85 },
      { id: 'l-t4-att0', source: 't4', target: 'att0', tokenId: 't4', weight: 0.9 },
      { id: 'l-t5-att0', source: 't5', target: 'att0', tokenId: 't5', weight: 0.6 },
      { id: 'l-t6-att0', source: 't6', target: 'att0', tokenId: 't6', weight: 0.75 },
      { id: 'l-t7-att0', source: 't7', target: 'att0', tokenId: 't7', weight: 0.8 },
      { id: 'l-t8-att0', source: 't8', target: 'att0', tokenId: 't8', weight: 0.85 },
      // Attention to MLP
      { id: 'l-att0-mlp0', source: 'att0', target: 'mlp0' },
      { id: 'l-att1-mlp1', source: 'att1', target: 'mlp1' },
      // MLP to output
      { id: 'l-mlp0-out0', source: 'mlp0', target: 'out0' },
      { id: 'l-mlp1-out1', source: 'mlp1', target: 'out1' },
      // Attention layers
      { id: 'l-out0-att1', source: 'out0', target: 'att1' }
    ]
  };
</script>

<section id="intro" class="scroll-mt-20">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-8 text-center">
      <h2 class="mb-4 text-4xl font-bold tracking-tight text-slate-50">{introData.title}</h2>
      <p class="mx-auto max-w-2xl text-lg text-slate-300">{introData.description}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      {#each introData.stats as stat}
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <div class="mb-2 text-3xl font-bold text-sky-400">{stat.value}</div>
          <div class="text-sm text-slate-400">{stat.label}</div>
        </div>
      {/each}
    </div>

    <div class="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div class="mb-4 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-emerald-400" />
        <h3 class="text-lg font-semibold text-slate-50">Model Architecture Overview</h3>
      </div>
      <p class="text-sm leading-relaxed text-slate-300 mb-6">
        This interactive visualization breaks down the transformer architecture into its core
        components. Each section below demonstrates how input text flows through the model,
        transforming tokens into embeddings, computing attention weights, and generating
        predictions.
      </p>

      <!-- OverviewFlow Demo -->
      <div class="mt-6">
        <h4 class="mb-3 text-sm font-semibold text-slate-200">Interactive Flow Visualization</h4>
        <p class="mb-4 text-xs text-slate-400">
          Hover over tokens to highlight their flow paths. Click to select a token and see its
          connections through the transformer layers.
        </p>
        <div class="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
          <OverviewFlow graph={demoGraph} width={700} height={480} />
        </div>
      </div>
    </div>
  </div>
</section>

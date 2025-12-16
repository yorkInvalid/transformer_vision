<script lang="ts">
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
      <p class="text-sm leading-relaxed text-slate-300">
        This interactive visualization breaks down the transformer architecture into its core
        components. Each section below demonstrates how input text flows through the model,
        transforming tokens into embeddings, computing attention weights, and generating predictions.
      </p>
    </div>
  </div>
</section>


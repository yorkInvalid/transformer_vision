<script lang="ts">
  import TopControlBar from './lib/components/TopControlBar.svelte';
  import IntroView from './lib/components/sections/IntroView.svelte';
  import EmbeddingView from './lib/components/sections/EmbeddingView.svelte';
  import AttentionView from './lib/components/sections/AttentionView.svelte';
  import MLPView from './lib/components/sections/MLPView.svelte';
  import OutputSamplingView from './lib/components/sections/OutputSamplingView.svelte';
  import FAQView from './lib/components/sections/FAQView.svelte';
  import PerformancePanel from './lib/components/PerformancePanel.svelte';
</script>

<div class="min-h-screen bg-slate-950 text-slate-50">
  <TopControlBar />
  <PerformancePanel />

  <main class="pt-0">
    <IntroView />
    <EmbeddingView />
    <AttentionView />
    <MLPView />
    <OutputSamplingView />
    <FAQView />
  </main>
</div>

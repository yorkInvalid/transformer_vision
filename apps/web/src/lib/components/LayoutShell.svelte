<script lang="ts">
  export let title: string = 'Transformer Learning';
</script>

<main class="min-h-screen flex flex-col">
  <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <h1 class="text-lg font-semibold tracking-tight">
        <span class="text-sky-400">Transformer</span>
        <span class="text-slate-50"> Learning</span>
      </h1>
      <span class="text-xs text-slate-400">Svelte · Vite · Tailwind · d3 · ONNX Runtime Web</span>
    </div>
  </header>

  <section class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
    <slot />
  </section>

  <footer class="border-t border-slate-800 bg-slate-900/60 text-xs text-slate-500">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <span>{title}</span>
      <span>Built with Svelte &amp; Vite</span>
    </div>
  </footer>
</main>



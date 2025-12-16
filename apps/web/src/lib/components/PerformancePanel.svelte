<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { modelStore } from '../state/modelStore';
  import { get } from 'svelte/store';

  let isOpen = true;
  let hoverFPS = 0;
  let rafCount = 0;
  let lastTime = performance.now();
  let rafId: number | null = null;

  function measureFPS() {
    const now = performance.now();
    const elapsed = now - lastTime;

    if (elapsed >= 1000) {
      hoverFPS = Math.round((rafCount * 1000) / elapsed);
      rafCount = 0;
      lastTime = now;
    }

    rafCount++;
    rafId = requestAnimationFrame(measureFPS);
  }

  onMount(() => {
    rafId = requestAnimationFrame(measureFPS);
  });

  onDestroy(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });
</script>

<div class="performance-panel">
  <button
    type="button"
    class="toggle-button"
    onclick={() => (isOpen = !isOpen)}
    aria-label={isOpen ? 'Hide performance panel' : 'Show performance panel'}
  >
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d={isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
    Performance
  </button>

  {#if isOpen}
    <div class="panel-content">
      <div class="metric">
        <span class="label">EP:</span>
        <span class="value ep-{$modelStore.ep}">{$modelStore.ep}</span>
      </div>

      {#if $modelStore.timing.loadMs !== null}
        <div class="metric">
          <span class="label">Load:</span>
          <span class="value">{$modelStore.timing.loadMs.toFixed(0)}ms</span>
        </div>
      {/if}

      {#if $modelStore.timing.inferMs !== null}
        <div class="metric">
          <span class="label">Infer:</span>
          <span class="value">{$modelStore.timing.inferMs.toFixed(0)}ms</span>
        </div>
      {/if}

      {#if $modelStore.timing.avgInferMs !== null}
        <div class="metric">
          <span class="label">Avg:</span>
          <span class="value">{$modelStore.timing.avgInferMs.toFixed(0)}ms</span>
        </div>
      {/if}

      <div class="metric">
        <span class="label">Hover FPS:</span>
        <span class="value">{hoverFPS}</span>
      </div>

      <div class="metric">
        <span class="label">Cache:</span>
        <span class="value">
          {$modelStore.cacheStats.hits}/{$modelStore.cacheStats.misses + $modelStore.cacheStats.hits}
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .performance-panel {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 100;
    background-color: rgb(15 23 42 / 0.9);
    border: 1px solid rgb(51 65 85);
    border-radius: 0.5rem;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    min-width: 200px;
  }

  .toggle-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: rgb(203 213 225);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .toggle-button:hover {
    background-color: rgb(30 41 59 / 0.5);
  }

  .icon {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s;
  }

  .panel-content {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgb(51 65 85);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .label {
    color: rgb(148 163 184);
  }

  .value {
    color: rgb(203 213 225);
    font-family: monospace;
    font-weight: 600;
  }

  .ep-webgpu {
    color: rgb(34 197 94);
  }

  .ep-wasm {
    color: rgb(251 191 36);
  }

  .ep-unknown {
    color: rgb(148 163 184);
  }
</style>


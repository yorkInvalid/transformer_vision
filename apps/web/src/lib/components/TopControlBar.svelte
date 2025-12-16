<script lang="ts">
  import { appState } from '../state/index';
  import { onMount } from 'svelte';

  const examples = [
    { label: 'Example 1: Simple prompt', value: 'The quick brown fox' },
    { label: 'Example 2: Question', value: 'What is the meaning of life?' },
    { label: 'Example 3: Code snippet', value: 'function hello() { return "world"; }' }
  ];

  let selectedExample = '';
  let isDropdownOpen = false;
  let dropdownButton: HTMLButtonElement;
  let dropdownMenu: HTMLDivElement;

  function handleExampleSelect(value: string) {
    appState.update((s) => ({ ...s, inputText: value }));
    selectedExample = '';
    isDropdownOpen = false;
  }

  function handleGenerate() {
    // Generate action will be handled by parent or store
    console.log('Generate clicked', appState);
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      dropdownButton &&
      dropdownMenu &&
      !dropdownButton.contains(event.target as Node) &&
      !dropdownMenu.contains(event.target as Node)
    ) {
      isDropdownOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<header
  class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm shadow-lg shadow-slate-950/20"
>
  <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
    <div class="flex flex-wrap items-center gap-3">
      <!-- Examples Dropdown -->
      <div class="relative">
        <button
          bind:this={dropdownButton}
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          onclick={() => (isDropdownOpen = !isDropdownOpen)}
        >
          <span>Examples</span>
          <svg
            class="h-4 w-4 transition-transform {isDropdownOpen ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {#if isDropdownOpen}
          <div
            bind:this={dropdownMenu}
            class="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
          >
            <ul class="py-1">
              {#each examples as example}
                <li>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800"
                    onclick={() => handleExampleSelect(example.value)}
                  >
                    <div class="font-medium">{example.label}</div>
                    <div class="mt-0.5 truncate text-xs text-slate-400">{example.value}</div>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <!-- Input Text -->
      <div class="flex-1 min-w-[200px]">
        <input
          type="text"
          class="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          placeholder="Enter your prompt..."
          bind:value={$appState.inputText}
        />
      </div>

      <!-- Generate Button -->
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 active:bg-sky-700"
        onclick={handleGenerate}
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Generate
      </button>
    </div>

    <!-- Temperature & Sampling Controls -->
    <div class="flex flex-wrap items-center gap-4 text-sm">
      <!-- Temperature Slider -->
      <div class="flex items-center gap-3">
        <label class="text-slate-400">Temperature:</label>
        <div class="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-600"
            bind:value={$appState.temperature}
          />
          <span class="w-10 text-right font-mono text-slate-200"
            >{$appState.temperature.toFixed(1)}</span
          >
        </div>
      </div>

      <!-- Sampling Mode Toggle -->
      <div class="flex items-center gap-2">
        <span class="text-slate-400">Mode:</span>
        <div class="inline-flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5">
          <button
            type="button"
            class="rounded px-2.5 py-1 text-xs font-medium transition-colors {$appState.samplingMode ===
            'top-k'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:text-slate-200'}"
            onclick={() => appState.update((s) => ({ ...s, samplingMode: 'top-k' }))}
          >
            Top-K
          </button>
          <button
            type="button"
            class="rounded px-2.5 py-1 text-xs font-medium transition-colors {$appState.samplingMode ===
            'top-p'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:text-slate-200'}"
            onclick={() => appState.update((s) => ({ ...s, samplingMode: 'top-p' }))}
          >
            Top-P
          </button>
        </div>
      </div>

      <!-- Top-K / Top-P Value Input -->
      {#if $appState.samplingMode === 'top-k'}
        <div class="flex items-center gap-2">
          <label class="text-slate-400">Top-K:</label>
          <input
            type="number"
            min="1"
            max="100"
            class="w-16 rounded border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            bind:value={$appState.topK}
          />
        </div>
      {:else}
        <div class="flex items-center gap-2">
          <label class="text-slate-400">Top-P:</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            class="w-16 rounded border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            bind:value={$appState.topP}
          />
        </div>
      {/if}
    </div>
  </div>
</header>

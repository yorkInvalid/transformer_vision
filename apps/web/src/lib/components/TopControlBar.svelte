<script lang="ts">
  import { appState, inferenceStore, performanceMetrics } from '../state/index';
  import { onMount } from 'svelte';
  import {
    initInferenceService,
    loadModel,
    generateNextToken,
    tokenizer,
  } from '../model/inferenceService';
  import { get } from 'svelte/store';

  const examples = [
    { label: 'Example 1: Simple prompt', value: 'The quick brown fox' },
    { label: 'Example 2: Question', value: 'What is the meaning of life?' },
    { label: 'Example 3: Code snippet', value: 'function hello() { return "world"; }' }
  ];

  let selectedExample = '';
  let isDropdownOpen = false;
  let dropdownButton: HTMLButtonElement;
  let dropdownMenu: HTMLDivElement;
  let errorMessage: string | null = null;
  let errorTimeout: number | null = null;

  function handleExampleSelect(value: string) {
    appState.update((s) => ({ ...s, inputText: value }));
    selectedExample = '';
    isDropdownOpen = false;
  }

  async function handleGenerate() {
    const state = get(inferenceStore);
    const app = get(appState);

    // Clear previous error
    errorMessage = null;
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }

    // Check if model is loaded
    if (!state.session) {
      // Load model first
      try {
        await loadModel(undefined, '/', true);
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Failed to load model';
        errorTimeout = setTimeout(() => {
          errorMessage = null;
        }, 5000);
        return;
      }
    }

    // Check if already generating
    if (state.isGenerating) {
      return;
    }

    // Generate next token
    try {
      const inputText = app.inputText || '';
      const tokenId = await generateNextToken(
        inputText,
        app.temperature,
        app.samplingMode,
        app.topK,
        app.topP
      );

      // Decode token and append to output
      const tokenText = tokenizer.decodeToken(tokenId);
      inferenceActions.appendToken(tokenId, tokenText);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Generation failed';
      errorTimeout = setTimeout(() => {
        errorMessage = null;
      }, 5000);
    }
  }

  // Import inferenceActions
  import { inferenceActions } from '../state/inferenceStore';

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
    // Initialize inference service
    initInferenceService('/');

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
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
        class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 active:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={handleGenerate}
        disabled={$inferenceStore.isLoading || $inferenceStore.isGenerating}
      >
        {#if $inferenceStore.isLoading}
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        {:else if $inferenceStore.isGenerating}
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generating...
        {:else}
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Generate
        {/if}
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

    <!-- Status Bar: EP, Timing, Error -->
    <div class="flex flex-wrap items-center gap-4 text-xs text-slate-400">
      <!-- Execution Provider -->
      {#if $performanceMetrics.executionProvider}
        <div class="flex items-center gap-1.5">
          <span class="font-medium">EP:</span>
          <span class="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">
            {$performanceMetrics.executionProvider}
          </span>
        </div>
      {/if}

      <!-- Model Load Time -->
      {#if $performanceMetrics.modelLoadTime !== null}
        <div class="flex items-center gap-1.5">
          <span>Load:</span>
          <span class="font-mono text-slate-300">
            {$performanceMetrics.modelLoadTime.toFixed(0)}ms
          </span>
        </div>
      {/if}

      <!-- Last Inference Time -->
      {#if $performanceMetrics.lastInferenceTime !== null}
        <div class="flex items-center gap-1.5">
          <span>Inference:</span>
          <span class="font-mono text-slate-300">
            {$performanceMetrics.lastInferenceTime.toFixed(0)}ms
          </span>
        </div>
      {/if}

      <!-- Error Message -->
      {#if errorMessage || $inferenceStore.error}
        <div class="flex items-center gap-1.5 text-red-400">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{errorMessage || $inferenceStore.error?.message || 'Error'}</span>
        </div>
      {/if}
    </div>

    <!-- Output Text Display -->
    {#if $inferenceStore.outputText}
      <div class="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
        <div class="mb-1 text-xs font-medium text-slate-400">Generated Output:</div>
        <div class="text-sm text-slate-200 whitespace-pre-wrap break-words">
          {$inferenceStore.outputText}
        </div>
      </div>
    {/if}
  </div>
</header>

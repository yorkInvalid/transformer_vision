<script lang="ts">
  const faqs = [
    {
      question: 'What is a transformer?',
      answer:
        'A transformer is a deep learning architecture that uses self-attention mechanisms to process sequences. It was introduced in "Attention Is All You Need" and has become the foundation for many modern language models.'
    },
    {
      question: 'How does attention work?',
      answer:
        'Attention computes relationships between all pairs of tokens in a sequence. Each token can attend to all other tokens, allowing the model to capture long-range dependencies and contextual information.'
    },
    {
      question: 'What is the difference between Top-K and Top-P sampling?',
      answer:
        'Top-K sampling selects from the K most likely tokens, while Top-P (nucleus) sampling selects from the smallest set of tokens whose cumulative probability exceeds P. Top-P is more adaptive as it adjusts the number of candidates based on the distribution.'
    },
    {
      question: 'What does temperature control?',
      answer:
        'Temperature scales the logits before applying softmax. Lower temperatures (closer to 0) make the distribution sharper and more deterministic, while higher temperatures increase randomness and diversity in outputs.'
    },
    {
      question: 'How are embeddings learned?',
      answer:
        'Embeddings are learned during training. The embedding layer is a learnable matrix that maps token IDs to dense vectors. These vectors are optimized to capture semantic relationships through backpropagation.'
    }
  ];

  let openIndex: number | null = null;

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index;
  }
</script>

<section id="faq" class="scroll-mt-20 bg-slate-900/30">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-8 text-center">
      <h2 class="mb-2 text-4xl font-bold tracking-tight text-slate-50">Frequently Asked Questions</h2>
      <p class="text-slate-400">Common questions about transformer models and this visualization.</p>
    </div>

    <div class="space-y-3">
      {#each faqs as faq, i}
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <button
            type="button"
            class="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            onclick={() => toggle(i)}
          >
            <span class="font-semibold text-slate-50">{faq.question}</span>
            <svg
              class="h-5 w-5 text-slate-400 transition-transform {openIndex === i ? 'rotate-180' : ''}"
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
          {#if openIndex === i}
            <div class="px-6 pb-4 text-sm leading-relaxed text-slate-300">{faq.answer}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>


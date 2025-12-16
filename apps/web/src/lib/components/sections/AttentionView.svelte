<script lang="ts">
  import AttentionMatrix from '../AttentionMatrix.svelte';
  import type { Token, AttentionTensor } from '../../viz/types';

  // Placeholder data for Attention section
  const attentionData = {
    numHeads: 12,
    sequenceLength: 4,
    tokens: ['The', 'quick', 'brown', 'fox'],
    attentionMatrix: [
      [1.0, 0.3, 0.1, 0.05],
      [0.2, 1.0, 0.4, 0.1],
      [0.1, 0.3, 1.0, 0.2],
      [0.05, 0.1, 0.3, 1.0]
    ]
  };

  // Demo data for AttentionMatrix (16 tokens, 12 heads)
  const demoTokens: Token[] = [
    { id: 't0', text: 'The' },
    { id: 't1', text: 'quick' },
    { id: 't2', text: 'brown' },
    { id: 't3', text: 'fox' },
    { id: 't4', text: 'jumps' },
    { id: 't5', text: 'over' },
    { id: 't6', text: 'the' },
    { id: 't7', text: 'lazy' },
    { id: 't8', text: 'dog' },
    { id: 't9', text: 'and' },
    { id: 't10', text: 'runs' },
    { id: 't11', text: 'through' },
    { id: 't12', text: 'the' },
    { id: 't13', text: 'forest' },
    { id: 't14', text: 'with' },
    { id: 't15', text: 'joy' }
  ];

  // 生成假数据：构造有结构的 attention pattern
  function generateAttentionTensor(numHeads: number, seqLen: number): AttentionTensor {
    const tensor: AttentionTensor = [];

    for (let h = 0; h < numHeads; h++) {
      const headMatrix: number[][] = [];

      for (let i = 0; i < seqLen; i++) {
        const row: number[] = [];
        for (let j = 0; j < seqLen; j++) {
          let value: number;

          // 构造不同的 attention pattern（每个 head 略有不同）
          if (i === j) {
            // 对角线（自注意力）总是较高
            value = 0.8 + Math.random() * 0.2;
          } else {
            // 根据距离和 head 索引生成不同的模式
            const distance = Math.abs(i - j);
            const baseValue = Math.exp(-distance / (seqLen / 2));
            const headBias = Math.sin((h * Math.PI) / numHeads) * 0.3;
            value = baseValue * (0.3 + Math.random() * 0.4) + headBias;
            value = Math.max(0, Math.min(1, value)); // 限制在 [0, 1]
          }

          row.push(value);
        }
        headMatrix.push(row);
      }

      tensor.push(headMatrix);
    }

    return tensor;
  }

  const demoAttentionTensor: AttentionTensor = generateAttentionTensor(12, demoTokens.length);
</script>

<section id="attention" class="scroll-mt-20">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <div class="mb-6">
      <h2 class="mb-2 text-3xl font-bold tracking-tight text-slate-50">Multi-Head Attention</h2>
      <p class="text-slate-400">
        Attention mechanisms allow the model to focus on different parts of the input sequence,
        computing relationships between all token pairs.
      </p>
    </div>

    <!-- Attention Matrix Visualization (Canvas) -->
    <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-50">Interactive Attention Matrix</h3>
      <p class="mb-4 text-sm text-slate-400">
        Hover over cells to see attention weights. Switch between heads to explore different
        attention patterns. Each head learns to focus on different aspects of relationships between
        tokens.
      </p>
      <div class="min-h-[500px]">
        <AttentionMatrix
          tokens={demoTokens}
          attn={demoAttentionTensor}
          initialHead={0}
          showValuesOnHover={true}
        />
      </div>
    </div>

    <!-- Legacy HTML Table Visualization (保留作为对比) -->
    <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-50">
        Attention Weights Matrix (Table View)
      </h3>
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full">
          <!-- Header row -->
          <div class="mb-2 flex">
            <div class="w-20 flex-shrink-0" />
            {#each attentionData.tokens as token}
              <div class="flex-1 text-center text-xs font-medium text-slate-400">{token}</div>
            {/each}
          </div>
          <!-- Matrix rows -->
          {#each attentionData.attentionMatrix as row, i}
            <div class="mb-1 flex items-center">
              <div class="w-20 flex-shrink-0 text-xs font-medium text-slate-400">
                {attentionData.tokens[i]}
              </div>
              {#each row as weight, j}
                <div
                  class="flex-1 rounded border border-slate-700 bg-slate-800 p-2 text-center text-xs font-mono"
                  style="background-color: rgba(56, 189, 248, {weight});"
                >
                  {weight.toFixed(2)}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
      <p class="mt-4 text-xs text-slate-400">
        Each cell represents the attention weight from one token (row) to another (column). Higher
        values indicate stronger attention.
      </p>
    </div>

    <!-- Multi-Head Explanation -->
    <div class="grid gap-6 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Attention Heads</h3>
        <p class="mb-4 text-sm text-slate-300">
          This model uses {attentionData.numHeads} parallel attention heads, each learning different aspects
          of relationships between tokens.
        </p>
        <div class="flex flex-wrap gap-2">
          {#each Array(attentionData.numHeads) as _, i}
            <div
              class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300"
            >
              Head {i + 1}
            </div>
          {/each}
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 class="mb-3 text-lg font-semibold text-slate-50">Query, Key, Value</h3>
        <p class="text-sm leading-relaxed text-slate-300">
          Each attention head computes three projections: Query (Q), Key (K), and Value (V). The
          attention scores are computed as QK<sup>T</sup>, then applied to V to produce the output.
        </p>
      </div>
    </div>

    <!-- Explanation Card -->
    <div class="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div class="mb-3 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-sky-400" />
        <h3 class="text-lg font-semibold text-slate-50">Why Attention Matters</h3>
      </div>
      <p class="text-sm leading-relaxed text-slate-300">
        Self-attention allows each position in the sequence to attend to all other positions,
        enabling the model to capture long-range dependencies and contextual relationships. This is
        a key innovation that makes transformers effective for understanding language.
      </p>
    </div>
  </div>
</section>

<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import * as d3 from 'd3';
  import type { FlowGraph } from '../viz/types';
  import { computeLayout, linkPathBezier } from '../viz/path';
  import { selectedTokenId, hoverTokenId } from '../state/vizStore';

  export let graph: FlowGraph;
  export let width: number = 800;
  export let height: number = 400;
  export let selectedTokenIdProp: string | null = null;
  export let hoverTokenIdProp: string | null = null;

  // 内部状态：优先使用 props，其次使用 store
  $: effectiveSelectedTokenId = selectedTokenIdProp ?? $selectedTokenId;
  $: effectiveHoverTokenId = hoverTokenIdProp ?? $hoverTokenId;

  let svgElement: SVGElement;
  let layoutResult: ReturnType<typeof computeLayout> | null = null;
  let previousLayoutResult: ReturnType<typeof computeLayout> | null = null;
  let needsTransition = false;

  // 计算布局（只在 graph/width/height 变化时执行）
  $: {
    if (graph && width > 0 && height > 0) {
      if (layoutResult) {
        previousLayoutResult = layoutResult;
        needsTransition = true;
      }
      layoutResult = computeLayout(graph, width, height);
    }
  }

  // 处理 token hover
  function handleTokenHover(tokenId: string | null) {
    if (hoverTokenIdProp === undefined) {
      // 如果没有传入 prop，则更新 store
      hoverTokenId.set(tokenId);
    }
  }

  // 处理 token click
  function handleTokenClick(tokenId: string) {
    if (selectedTokenIdProp === undefined) {
      // 如果没有传入 prop，则更新 store
      selectedTokenId.set(tokenId);
    }
  }

  // 处理键盘事件（用于可访问性）
  function handleTokenKeydown(event: KeyboardEvent, tokenId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTokenClick(tokenId);
    }
  }

  // 判断 link 是否应该高亮
  function isLinkActive(link: { tokenId?: string }): boolean {
    const activeTokenId = effectiveHoverTokenId || effectiveSelectedTokenId;
    if (!activeTokenId) return false;
    return link.tokenId === activeTokenId;
  }

  // 应用 D3 transition
  function applyTransitions() {
    if (!svgElement || !layoutResult) return;

    const svg = d3.select(svgElement);
    const transition = d3.transition().duration(300).ease(d3.easeCubicInOut);

    // 更新节点位置
    svg
      .selectAll<SVGCircleElement, (typeof layoutResult.nodes)[0]>('.flow-node')
      .data(layoutResult.nodes, (d: (typeof layoutResult.nodes)[0]) => d.id)
      .transition(transition)
      .attr('cx', (d: (typeof layoutResult.nodes)[0]) => d.x)
      .attr('cy', (d: (typeof layoutResult.nodes)[0]) => d.y);

    // 更新连接路径
    svg
      .selectAll<SVGPathElement, (typeof layoutResult.links)[0]>('.flow-link')
      .data(layoutResult.links, (d: (typeof layoutResult.links)[0]) => d.id)
      .transition(transition)
      .attrTween('d', function (d: (typeof layoutResult.links)[0]) {
        const previous = previousLayoutResult?.links.find((l) => l.id === d.id);
        if (previous) {
          const previousD = linkPathBezier(
            previous.sourceX,
            previous.sourceY,
            previous.targetX,
            previous.targetY
          );
          const currentD = linkPathBezier(d.sourceX, d.sourceY, d.targetX, d.targetY);
          return d3.interpolateString(previousD, currentD);
        }
        // 如果没有之前的路径，直接返回当前路径
        return () => linkPathBezier(d.sourceX, d.sourceY, d.targetX, d.targetY);
      });
  }

  // 在组件更新后应用 transition
  afterUpdate(() => {
    if (needsTransition && layoutResult && previousLayoutResult) {
      applyTransitions();
      needsTransition = false;
    }
  });

  // 初始化时应用布局
  onMount(() => {
    if (layoutResult) {
      applyTransitions();
    }
  });
</script>

<div class="overview-flow-container">
  <!-- Token 标签列表（左侧） -->
  <div class="token-labels">
    {#each graph.tokens as token}
      <button
        type="button"
        class="token-label {effectiveSelectedTokenId === token.id
          ? 'selected'
          : ''} {effectiveHoverTokenId === token.id ? 'hover' : ''}"
        onmouseenter={() => handleTokenHover(token.id)}
        onmouseleave={() => handleTokenHover(null)}
        onclick={() => handleTokenClick(token.id)}
        aria-label="Select token: {token.text}"
      >
        {token.text}
      </button>
    {/each}
  </div>

  <!-- SVG 可视化区域 -->
  <svg bind:this={svgElement} {width} {height} class="flow-svg">
    <!-- 定义箭头标记 -->
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
      </marker>
    </defs>

    <!-- 连接路径 -->
    {#if layoutResult}
      {#each layoutResult.links as link}
        {@const isActive = isLinkActive(link)}
        <path
          class="flow-link {isActive ? 'active' : ''}"
          d={linkPathBezier(link.sourceX, link.sourceY, link.targetX, link.targetY)}
          data-link-id={link.id}
          data-token-id={link.tokenId || ''}
          stroke-width={link.weight ? Math.max(1, link.weight * 2) : 1.5}
          opacity={isActive ? 1.0 : 0.2}
          fill="none"
          stroke="currentColor"
          marker-end="url(#arrowhead)"
        />
      {/each}

      <!-- 节点 -->
      {#each layoutResult.nodes as node}
        {@const isTokenNode = node.kind === 'token'}
        {@const relatedTokenId = isTokenNode ? node.id : null}
        {@const isActive =
          relatedTokenId &&
          (effectiveHoverTokenId === relatedTokenId || effectiveSelectedTokenId === relatedTokenId)}
        {#if isTokenNode}
          <circle
            class="flow-node flow-node-{node.kind} {isActive ? 'active' : ''}"
            cx={node.x}
            cy={node.y}
            r={6}
            data-node-id={node.id}
            data-node-kind={node.kind}
            fill={isActive ? 'currentColor' : 'var(--node-color, #64748b)'}
            stroke="currentColor"
            stroke-width={isActive ? 2 : 1}
            opacity={isActive ? 1.0 : 0.6}
            onmouseenter={() => handleTokenHover(node.id)}
            onmouseleave={() => handleTokenHover(null)}
            onclick={() => handleTokenClick(node.id)}
            onkeydown={(e) => handleTokenKeydown(e, node.id)}
            role="button"
            aria-label="Select token: {node.id}"
            tabindex="0"
            style="cursor: pointer;"
          />
        {:else}
          <circle
            class="flow-node flow-node-{node.kind} {isActive ? 'active' : ''}"
            cx={node.x}
            cy={node.y}
            r={4}
            data-node-id={node.id}
            data-node-kind={node.kind}
            fill={isActive ? 'currentColor' : 'var(--node-color, #64748b)'}
            stroke="currentColor"
            stroke-width={isActive ? 2 : 1}
            opacity={isActive ? 1.0 : 0.6}
            role="presentation"
          />
        {/if}
      {/each}
    {/if}
  </svg>
</div>

<style>
  .overview-flow-container {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .token-labels {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 120px;
    padding: 0.5rem;
  }

  .token-label {
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid rgb(51 65 85);
    background-color: rgb(15 23 42 / 0.6);
    color: rgb(203 213 225);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
  }

  .token-label:hover,
  .token-label.hover {
    background-color: rgb(14 165 233 / 0.2);
    border-color: rgb(14 165 233);
    color: rgb(14 165 233);
  }

  .token-label.selected {
    background-color: rgb(14 165 233 / 0.3);
    border-color: rgb(14 165 233);
    color: rgb(14 165 233);
    font-weight: 600;
  }

  .flow-svg {
    flex: 1;
    border: 1px solid rgb(51 65 85);
    border-radius: 0.5rem;
    background-color: rgb(15 23 42 / 0.4);
  }

  .flow-link {
    transition: opacity 0.2s;
    color: rgb(148 163 184);
  }

  .flow-link.active {
    color: rgb(14 165 233);
    opacity: 1;
  }

  .flow-node {
    transition:
      opacity 0.2s,
      fill 0.2s,
      stroke-width 0.2s;
  }

  .flow-node.active {
    opacity: 1;
  }

  .flow-node-token {
    --node-color: rgb(14 165 233);
  }

  .flow-node-attention {
    --node-color: rgb(168 85 247);
  }

  .flow-node-mlp {
    --node-color: rgb(34 197 94);
  }

  .flow-node-output {
    --node-color: rgb(239 68 68);
  }
</style>

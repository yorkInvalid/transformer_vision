<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import type { Token, AttentionTensor, HoverCell } from '../viz/types';
  import { computeMatrixLayout, screenToCell } from '../viz/layout';
  import { makeColorScale, computeExtent } from '../viz/attentionColor';
  import { renderHeatmap, renderOverlay } from '../viz/attentionRender';
  import { selectedHead, hoverCell, hoverTokenId } from '../state/vizStore';
  import type { MatrixLayout } from '../viz/layout';

  export let tokens: Token[];
  export let attn: AttentionTensor;
  export let initialHead: number = 0;
  export let showValuesOnHover: boolean = true;
  export let compact: boolean = false;

  // Props 控制（受控模式）
  export let selectedHeadProp: number | undefined = undefined;
  export let hoverCellProp: HoverCell | null | undefined = undefined;
  export let hoverTokenIdProp: string | null | undefined = undefined;

  // 内部状态
  let container: HTMLDivElement;
  let mainCanvas: HTMLCanvasElement;
  let overlayCanvas: HTMLCanvasElement;
  let mainCtx: CanvasRenderingContext2D;
  let overlayCtx: CanvasRenderingContext2D;
  let layout: MatrixLayout | null = null;
  let colorScale: ((value: number) => string) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let rafId: number | null = null;
  let pendingPointerMove: { x: number; y: number } | null = null;
  let tooltipPosition = { x: 0, y: 0 };

  // 初始化 selectedHead（如果未设置）
  $: {
    if (selectedHeadProp === undefined && $selectedHead === 0 && initialHead !== 0) {
      selectedHead.set(initialHead);
    }
  }

  // 计算有效状态（props 优先）
  $: effectiveHead = selectedHeadProp ?? $selectedHead;
  $: effectiveHoverCell = hoverCellProp ?? $hoverCell;
  $: effectiveHoverTokenId = hoverTokenIdProp ?? $hoverTokenId;

  // 计算当前 head 的数据和 extent
  $: currentHeadData = attn[effectiveHead] || [];
  $: extent = currentHeadData.length > 0 ? computeExtent(attn, effectiveHead) : [0, 1];
  $: colorScale = makeColorScale({ domain: extent });

  // 计算 hover 的行索引
  $: hoverRowIndex =
    effectiveHoverTokenId !== null ? tokens.findIndex((t) => t.id === effectiveHoverTokenId) : null;

  // 初始化 Canvas
  function initCanvas() {
    if (!mainCanvas || !overlayCanvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // 设置主 Canvas
    mainCanvas.width = cssWidth * dpr;
    mainCanvas.height = cssHeight * dpr;
    mainCanvas.style.width = cssWidth + 'px';
    mainCanvas.style.height = cssHeight + 'px';
    mainCtx = mainCanvas.getContext('2d')!;
    mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 设置 overlay Canvas
    overlayCanvas.width = cssWidth * dpr;
    overlayCanvas.height = cssHeight * dpr;
    overlayCanvas.style.width = cssWidth + 'px';
    overlayCanvas.style.height = cssHeight + 'px';
    overlayCtx = overlayCanvas.getContext('2d')!;
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 计算布局
    layout = computeMatrixLayout({
      width: cssWidth,
      height: cssHeight,
      seqLen: tokens.length,
      compact
    });

    // 渲染
    if (currentHeadData.length > 0 && colorScale) {
      renderHeatmap(mainCtx, currentHeadData, layout, colorScale);
    }
    renderOverlay(overlayCtx, layout, effectiveHoverCell, hoverRowIndex);
  }

  // 处理 pointer move（节流）
  function handlePointerMove(event: PointerEvent) {
    // 只记录最新坐标，不立即处理
    pendingPointerMove = {
      x: event.clientX,
      y: event.clientY
    };

    // 如果已经有待处理的 RAF，不重复请求
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingPointerMove && layout && overlayCanvas) {
          processPointerMove(pendingPointerMove.x, pendingPointerMove.y);
          pendingPointerMove = null;
        }
      });
    }
  }

  // 处理 pointer move（实际处理）
  function processPointerMove(clientX: number, clientY: number) {
    if (!layout || !overlayCanvas) return;

    const rect = overlayCanvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    // 更新 tooltip 位置
    tooltipPosition = { x: clientX, y: clientY };

    // 转换为 canvas 坐标（考虑 devicePixelRatio）
    const dpr = window.devicePixelRatio || 1;
    const canvasX = localX * dpr;
    const canvasY = localY * dpr;

    const cell = screenToCell(canvasX, canvasY, layout);

    if (cell) {
      const { i, j } = cell;
      const value = currentHeadData[i]?.[j] ?? 0;
      const newHoverCell: HoverCell = {
        i,
        j,
        value,
        head: effectiveHead
      };

      // 更新 store（如果未使用 props）
      if (hoverCellProp === undefined) {
        hoverCell.set(newHoverCell);
      }
    } else {
      // 清除 hover
      if (hoverCellProp === undefined) {
        hoverCell.set(null);
      }
    }
  }

  function handlePointerLeave() {
    if (hoverCellProp === undefined) {
      hoverCell.set(null);
    }
  }

  // 响应式更新渲染
  $: {
    if (mainCtx && layout && currentHeadData.length > 0 && colorScale) {
      renderHeatmap(mainCtx, currentHeadData, layout, colorScale);
    }
  }

  $: {
    if (overlayCtx && layout) {
      renderOverlay(overlayCtx, layout, effectiveHoverCell, hoverRowIndex);
    }
  }

  // ResizeObserver
  onMount(() => {
    if (!container) return;

    initCanvas();

    // 监听容器尺寸变化
    resizeObserver = new ResizeObserver(() => {
      initCanvas();
    });
    resizeObserver.observe(container);

    // 绑定 pointer 事件
    overlayCanvas.addEventListener('pointermove', handlePointerMove);
    overlayCanvas.addEventListener('pointerleave', handlePointerLeave);
  });

  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    if (overlayCanvas) {
      overlayCanvas.removeEventListener('pointermove', handlePointerMove);
      overlayCanvas.removeEventListener('pointerleave', handlePointerLeave);
    }
  });
</script>

<div bind:this={container} class="attention-matrix-container">
  <!-- Head 切换控制 -->
  <div class="head-controls">
    <div class="head-tabs">
      {#each attn as _, headIndex}
        <button
          type="button"
          class="head-tab {effectiveHead === headIndex ? 'active' : ''}"
          onclick={() => {
            if (selectedHeadProp === undefined) {
              selectedHead.set(headIndex);
            }
          }}
        >
          Head {headIndex + 1}
        </button>
      {/each}
    </div>
  </div>

  <!-- Canvas 区域 -->
  <div class="canvas-wrapper">
    <canvas bind:this={mainCanvas} class="main-canvas"></canvas>
    <canvas bind:this={overlayCanvas} class="overlay-canvas"></canvas>
  </div>

  <!-- Tooltip -->
  {#if effectiveHoverCell && showValuesOnHover}
    {@const iToken = tokens[effectiveHoverCell.i]}
    {@const jToken = tokens[effectiveHoverCell.j]}
    <div class="tooltip" style="left: {tooltipPosition.x + 10}px; top: {tooltipPosition.y + 10}px;">
      <div class="tooltip-header">Head {effectiveHoverCell.head + 1}</div>
      <div class="tooltip-content">
        <div>
          <span class="tooltip-label">From:</span>
          {iToken?.text || 'N/A'}
        </div>
        <div>
          <span class="tooltip-label">To:</span>
          {jToken?.text || 'N/A'}
        </div>
        <div>
          <span class="tooltip-label">Value:</span>
          <span class="tooltip-value">{effectiveHoverCell.value.toFixed(4)}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .attention-matrix-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .head-controls {
    display: flex;
    justify-content: center;
  }

  .head-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .head-tab {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid rgb(51 65 85);
    background-color: rgb(15 23 42 / 0.6);
    color: rgb(203 213 225);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .head-tab:hover {
    background-color: rgb(14 165 233 / 0.2);
    border-color: rgb(14 165 233);
    color: rgb(14 165 233);
  }

  .head-tab.active {
    background-color: rgb(14 165 233 / 0.3);
    border-color: rgb(14 165 233);
    color: rgb(14 165 233);
    font-weight: 600;
  }

  .canvas-wrapper {
    position: relative;
    width: 100%;
    border: 1px solid rgb(51 65 85);
    border-radius: 0.5rem;
    background-color: rgb(15 23 42 / 0.4);
    overflow: hidden;
  }

  .main-canvas,
  .overlay-canvas {
    display: block;
    width: 100%;
    height: auto;
    cursor: crosshair;
  }

  .overlay-canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: auto;
  }

  .tooltip {
    position: absolute;
    padding: 0.75rem;
    background-color: rgb(15 23 42);
    border: 1px solid rgb(51 65 85);
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    pointer-events: none;
    z-index: 10;
    font-size: 0.875rem;
  }

  .tooltip-header {
    font-weight: 600;
    color: rgb(14 165 233);
    margin-bottom: 0.5rem;
  }

  .tooltip-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: rgb(203 213 225);
  }

  .tooltip-label {
    font-weight: 500;
    color: rgb(148 163 184);
  }

  .tooltip-value {
    font-family: monospace;
    color: rgb(14 165 233);
    font-weight: 600;
  }
</style>

/**
 * Attention Matrix 渲染模块
 */
import type { MatrixLayout } from './layout';
import type { HoverCell } from './types';

/**
 * 渲染热力图
 * @param ctx - Canvas 2D 上下文
 * @param data2d - 二维数组 [seqLen][seqLen]
 * @param layout - 布局信息
 * @param colorScale - 颜色映射函数
 */
export function renderHeatmap(
    ctx: CanvasRenderingContext2D,
    data2d: number[][],
    layout: MatrixLayout,
    colorScale: (value: number) => string
): void {
    const { cellSize, padding, seqLen } = layout;

    // 清空画布
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 绘制每个 cell
    for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < seqLen; j++) {
            const value = data2d[i][j];
            const color = colorScale(value);

            const x = padding.left + j * cellSize;
            const y = padding.top + i * cellSize;

            ctx.fillStyle = color;
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    }
}

/**
 * 渲染 overlay（高亮、十字线等）
 * @param ctx - Canvas 2D 上下文
 * @param layout - 布局信息
 * @param hoverCell - 当前 hover 的 cell
 * @param hoverRowIndex - 当前 hover 的行索引（来自 token）
 */
export function renderOverlay(
    ctx: CanvasRenderingContext2D,
    layout: MatrixLayout,
    hoverCell: HoverCell | null,
    hoverRowIndex: number | null
): void {
    const { cellSize, padding, seqLen } = layout;

    // 清空 overlay
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 如果 hover token 行，淡化其他行
    if (hoverRowIndex !== null && hoverRowIndex >= 0 && hoverRowIndex < seqLen) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 0; i < seqLen; i++) {
            if (i !== hoverRowIndex) {
                const y = padding.top + i * cellSize;
                ctx.fillRect(padding.left, y, cellSize * seqLen, cellSize);
            }
        }
    }

    // 如果 hover cell，高亮行和列
    if (hoverCell) {
        const { i, j } = hoverCell;

        // 高亮行
        ctx.fillStyle = 'rgba(14, 165, 233, 0.2)'; // sky-500 with opacity
        const rowY = padding.top + i * cellSize;
        ctx.fillRect(padding.left, rowY, cellSize * seqLen, cellSize);

        // 高亮列
        const colX = padding.left + j * cellSize;
        ctx.fillRect(colX, padding.top, cellSize, cellSize * seqLen);

        // 绘制十字线
        ctx.strokeStyle = 'rgb(14, 165, 233)'; // sky-500
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        // 垂直线
        ctx.beginPath();
        ctx.moveTo(colX + cellSize / 2, padding.top);
        ctx.lineTo(colX + cellSize / 2, padding.top + cellSize * seqLen);
        ctx.stroke();

        // 水平线
        ctx.beginPath();
        ctx.moveTo(padding.left, rowY + cellSize / 2);
        ctx.lineTo(padding.left + cellSize * seqLen, rowY + cellSize / 2);
        ctx.stroke();

        ctx.setLineDash([]);

        // 高亮当前 cell 边框
        ctx.strokeStyle = 'rgb(14, 165, 233)';
        ctx.lineWidth = 3;
        ctx.strokeRect(colX, rowY, cellSize, cellSize);
    }
}


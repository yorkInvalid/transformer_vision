/**
 * Attention Matrix 布局计算模块
 */

export interface MatrixLayout {
    cellSize: number;
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    plotRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    seqLen: number;
}

export interface LayoutOptions {
    width: number;
    height: number;
    seqLen: number;
    padding?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    compact?: boolean;
}

/**
 * 计算矩阵布局
 */
export function computeMatrixLayout(options: LayoutOptions): MatrixLayout {
    const {
        width,
        height,
        seqLen,
        padding = {},
        compact = false
    } = options;

    const defaultPadding = compact
        ? { top: 10, right: 10, bottom: 10, left: 10 }
        : { top: 40, right: 40, bottom: 40, left: 40 };

    const paddingTop = padding.top ?? defaultPadding.top;
    const paddingRight = padding.right ?? defaultPadding.right;
    const paddingBottom = padding.bottom ?? defaultPadding.bottom;
    const paddingLeft = padding.left ?? defaultPadding.left;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // 计算 cellSize（确保是正方形）
    const cellSize = Math.min(plotWidth / seqLen, plotHeight / seqLen);

    return {
        cellSize,
        padding: {
            top: paddingTop,
            right: paddingRight,
            bottom: paddingBottom,
            left: paddingLeft
        },
        plotRect: {
            x: paddingLeft,
            y: paddingTop,
            width: cellSize * seqLen,
            height: cellSize * seqLen
        },
        seqLen
    };
}

/**
 * 将屏幕坐标转换为 cell 索引
 */
export function screenToCell(
    x: number,
    y: number,
    layout: MatrixLayout
): { i: number; j: number } | null {
    const { cellSize, padding, seqLen } = layout;

    const localX = x - padding.left;
    const localY = y - padding.top;

    const j = Math.floor(localX / cellSize);
    const i = Math.floor(localY / cellSize);

    // 边界检查
    if (i >= 0 && i < seqLen && j >= 0 && j < seqLen) {
        return { i, j };
    }

    return null;
}


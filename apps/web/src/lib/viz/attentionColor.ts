/**
 * Attention Matrix 颜色映射模块
 */
import { scaleSequential } from 'd3-scale';
import * as d3Chromatic from 'd3-scale-chromatic';

export interface ColorScaleOptions {
    domain?: [number, number];
    scheme?: 'viridis' | 'plasma' | 'inferno' | 'magma' | 'blues' | 'reds';
}

/**
 * 创建颜色映射函数
 * @param domain - 值域 [min, max]，默认 [0, 1]
 * @param scheme - 配色方案，默认 'viridis'
 * @returns 颜色映射函数 (value: number) => string
 */
export function makeColorScale(
    options: ColorScaleOptions = {}
): (value: number) => string {
    const { domain = [0, 1], scheme = 'viridis' } = options;

    // 选择插值函数
    let interpolator: (t: number) => string;
    switch (scheme) {
        case 'viridis':
            interpolator = d3Chromatic.interpolateViridis;
            break;
        case 'plasma':
            interpolator = d3Chromatic.interpolatePlasma;
            break;
        case 'inferno':
            interpolator = d3Chromatic.interpolateInferno;
            break;
        case 'magma':
            interpolator = d3Chromatic.interpolateMagma;
            break;
        case 'blues':
            interpolator = d3Chromatic.interpolateBlues;
            break;
        case 'reds':
            interpolator = d3Chromatic.interpolateReds;
            break;
        default:
            interpolator = d3Chromatic.interpolateViridis;
    }

    return scaleSequential(domain, interpolator);
}

/**
 * 计算 AttentionTensor 的值域（extent）
 * @param attn - Attention 张量
 * @param head - Head 索引
 * @returns [min, max]
 */
export function computeExtent(attn: number[][][], head: number): [number, number] {
    const headData = attn[head];
    if (!headData || headData.length === 0) {
        return [0, 1];
    }

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < headData.length; i++) {
        for (let j = 0; j < headData[i].length; j++) {
            const value = headData[i][j];
            if (value < min) min = value;
            if (value > max) max = value;
        }
    }

    // 如果所有值相同，返回 [0, 1]
    if (min === max) {
        return [0, 1];
    }

    return [min, max];
}


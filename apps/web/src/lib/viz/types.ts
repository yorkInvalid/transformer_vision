/**
 * 可视化组件的类型定义
 */

export interface Token {
    id: string;
    text: string;
}

/**
 * Attention 张量：三维数组 [heads][seqLen][seqLen]
 */
export type AttentionTensor = number[][][];

/**
 * Hover cell 信息
 */
export interface HoverCell {
    i: number; // 行索引
    j: number; // 列索引
    value: number; // attention 值
    head: number; // head 索引
}

export interface FlowNode {
    id: string;
    kind: 'token' | 'residual' | 'attention' | 'mlp' | 'output' | string;
    layer?: number;
    x?: number;
    y?: number;
}

export interface FlowLink {
    id: string; // 稳定，用于 transition key
    source: string; // FlowNode.id
    target: string; // FlowNode.id
    tokenId?: string; // 用于"某 token 相关 link"高亮
    weight?: number; // 用于线宽，可选
}

export interface FlowGraph {
    tokens: Token[];
    nodes: FlowNode[];
    links: FlowLink[];
}


/**
 * OverviewFlow 可视化组件的类型定义
 */

export interface Token {
    id: string;
    text: string;
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


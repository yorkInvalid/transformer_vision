/**
 * OverviewFlow 路径生成与布局计算模块
 */
import type { FlowGraph, FlowNode, FlowLink } from './types';

export interface LayoutResult {
  nodes: (FlowNode & { x: number; y: number })[];
  links: (FlowLink & {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  })[];
}

/**
 * 计算节点和连接的布局
 * @param graph - 流图数据
 * @param width - SVG 宽度
 * @param height - SVG 高度
 * @returns 包含计算后坐标的节点和连接
 */
export function computeLayout(
  graph: FlowGraph,
  width: number,
  height: number
): LayoutResult {
  const { tokens, nodes, links } = graph;

  // 按 kind 和 layer 分组节点
  const nodeMap = new Map<string, FlowNode>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // 确定列数：token, residual, attention, mlp, output
  const kindOrder = ['token', 'residual', 'attention', 'mlp', 'output'];
  const kindColumns = new Map<string, number>();
  kindOrder.forEach((kind, idx) => {
    kindColumns.set(kind, idx);
  });

  // 计算每列的 x 坐标
  const numColumns = Math.max(
    ...Array.from(nodes.map((n) => kindColumns.get(n.kind) ?? 0).values())
  ) + 1;
  const columnWidth = width / (numColumns + 1);
  const paddingX = columnWidth * 0.2;

  // 计算每个节点的位置
  const layoutNodes: (FlowNode & { x: number; y: number })[] = nodes.map(
    (node) => {
      const column = kindColumns.get(node.kind) ?? 0;
      const x = paddingX + column * columnWidth + columnWidth / 2;

      // 对于 token 节点，按 token 顺序排列 y
      let y: number;
      if (node.kind === 'token') {
        const tokenIndex = tokens.findIndex((t) => t.id === node.id);
        if (tokenIndex >= 0) {
          const tokenSpacing = height / (tokens.length + 1);
          y = tokenSpacing * (tokenIndex + 1);
        } else {
          y = height / 2;
        }
      } else {
        // 其他节点：按 layer 或默认居中
        const layer = node.layer ?? 0;
        const layerNodes = nodes.filter((n) => n.kind === node.kind);
        const nodeIndex = layerNodes.findIndex((n) => n.id === node.id);
        const spacing = height / (layerNodes.length + 1);
        y = spacing * (nodeIndex + 1);
      }

      return { ...node, x, y };
    }
  );

  // 计算连接的路径坐标
  const layoutLinks = links.map((link) => {
    const sourceNode = layoutNodes.find((n) => n.id === link.source);
    const targetNode = layoutNodes.find((n) => n.id === link.target);

    if (!sourceNode || !targetNode) {
      throw new Error(
        `Link ${link.id} references missing node: source=${link.source}, target=${link.target}`
      );
    }

    return {
      ...link,
      sourceX: sourceNode.x,
      sourceY: sourceNode.y,
      targetX: targetNode.x,
      targetY: targetNode.y
    };
  });

  return {
    nodes: layoutNodes,
    links: layoutLinks
  };
}

/**
 * 生成平滑贝塞尔曲线路径
 * @param sx - 源点 x
 * @param sy - 源点 y
 * @param tx - 目标点 x
 * @param ty - 目标点 y
 * @param curvature - 曲率（0-1），默认 0.35
 * @returns SVG path d 字符串
 */
export function linkPathBezier(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  curvature = 0.35
): string {
  const dx = tx - sx;
  const c1x = sx + dx * curvature;
  const c2x = tx - dx * curvature;

  // 使用三次贝塞尔曲线：M (sx, sy) C (c1x, sy) (c2x, ty) (tx, ty)
  return `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ty}, ${tx} ${ty}`;
}

/**
 * 使用 d3-shape 生成路径（可选实现）
 * 注意：需要确保最终得到可插值的 d 字符串
 */
export function linkPathD3(
  sx: number,
  sy: number,
  tx: number,
  ty: number
): string {
  // 使用 d3.linkHorizontal 或 d3.linkVertical
  // 这里简化为与 linkPathBezier 相同的实现
  return linkPathBezier(sx, sy, tx, ty);
}


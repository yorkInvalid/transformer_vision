# OverviewFlow 可视化组件规范

## 数据结构约定

### Token
- `id: string` - 唯一标识符，必须稳定（用于 key）
- `text: string` - 显示的文本内容

### FlowNode
- `id: string` - 唯一标识符，必须稳定
- `kind: 'token' | 'residual' | 'attention' | 'mlp' | 'output' | string` - 节点类型
- `layer?: number` - 层号（可选，用于布局）
- `x?: number` - 计算后的 x 坐标（由 layout 函数填充）
- `y?: number` - 计算后的 y 坐标（由 layout 函数填充）

### FlowLink
- `id: string` - 唯一标识符，必须稳定（用于 transition key）
- `source: string` - 源节点 ID（FlowNode.id）
- `target: string` - 目标节点 ID（FlowNode.id）
- `tokenId?: string` - 关联的 token ID（用于高亮）
- `weight?: number` - 权重（用于线宽，可选）

### FlowGraph
- `tokens: Token[]` - Token 数组
- `nodes: FlowNode[]` - 节点数组
- `links: FlowLink[]` - 连接数组

## 交互规则

### hoverTokenId
- **行为**：当鼠标悬停在 token 标签或 token 节点上时
- **效果**：
  - 所有与 `tokenId` 相关的 links（`link.tokenId === tokenId`）添加 `class="active"`，opacity = 1.0
  - 其他 links 降低 opacity 至 0.2
  - 相关节点（source/target 与 token 相关）高亮显示
- **状态更新**：写回 store `hoverTokenId = token.id`
- **性能要求**：hover 时**不触发布局重算**，只修改 class 和 opacity

### selectedTokenId
- **行为**：点击 token 标签或 token 节点时
- **效果**：
  - 选中状态持久化（直到点击其他 token 或清空）
  - 相关 links 保持高亮
- **状态更新**：写回 store `selectedTokenId = token.id`

### mouseleave
- **行为**：鼠标离开 token 区域时
- **效果**：如果 `selectedTokenId` 为空，则恢复所有 links 的默认 opacity
- **状态更新**：`hoverTokenId = null`（但保留 `selectedTokenId`）

## 动画规则

### 路径 d 属性过渡
- **触发条件**：`graph` prop 更新或 `width/height` 更新
- **实现方式**：使用 `d3.transition()` 和 `d3.interpolateString()` 对 path 的 `d` 属性进行插值
- **duration**：300ms
- **ease**：`d3.easeCubicInOut`

### 节点位置过渡
- **触发条件**：布局计算后节点坐标变化
- **实现方式**：对节点的 `cx` 和 `cy` 属性使用 `d3.transition()`
- **duration**：300ms
- **ease**：`d3.easeCubicInOut`

### 性能要求
- 快速 hover 时**不卡顿**：hover 事件不触发布局重算
- 只在 `graph` prop 变化时重新计算布局
- 使用 `afterUpdate` 钩子对比新旧布局，只对变化的元素应用 transition

## 性能规则

1. **布局计算**：只在 `graph` prop 变化时执行，不在 hover 时执行
2. **DOM 更新**：hover 时只修改 class 和 opacity，不修改坐标
3. **Transition 管理**：使用 D3 selection 管理，避免重复创建 transition
4. **Key 稳定性**：所有元素必须使用稳定的 `id` 作为 key，确保 Svelte 正确追踪元素


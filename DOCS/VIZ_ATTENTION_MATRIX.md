# AttentionMatrix 可视化组件规范

## 渲染策略（硬约束）

### Canvas 渲染
- **热力图必须用 Canvas 渲染**（性能优先，避免 DOM 元素过多）
- **Hover/高亮尽量不重画整张**：允许使用 overlay Canvas 方案
  - 主 Canvas：渲染基础热力图（只在数据/head 变化时重绘）
  - Overlay Canvas：渲染 hover 高亮、十字线、边框（高频更新）

### 坐标与命中测试
- **鼠标位置 -> (i,j) 的换算必须基于 cellSize 与 padding**
- **必须考虑 devicePixelRatio**：
  - canvas.width = cssWidth * devicePixelRatio
  - canvas.height = cssHeight * devicePixelRatio
  - canvas.style.width = cssWidth + 'px'
  - canvas.style.height = cssHeight + 'px'
  - ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0) 或 ctx.scale(devicePixelRatio, devicePixelRatio)
- **坐标转换**：
  - 获取 canvas 的 bounding rect
  - pointer 坐标转换为 canvas 局部坐标：`localX = pointerX - rect.left`, `localY = pointerY - rect.top`
  - 计算 cell 索引：
    - `i = floor((localY - paddingTop) / cellSize)`
    - `j = floor((localX - paddingLeft) / cellSize)`
  - 边界检查：`i >= 0 && i < seqLen && j >= 0 && j < seqLen`

## 交互规则

### Hover Cell
- **行为**：鼠标悬停在热力图 cell 上
- **效果**：
  - 显示 tooltip（head, iToken, jToken, value）
  - 高亮对应行（i）和列（j）
  - 可选：显示十字线
- **状态更新**：`hoverCell = { i, j, value, head }`

### Hover Token
- **行为**：鼠标悬停在 token 列表或外部联动
- **效果**：
  - 高亮对应行（i）
  - 其他行淡化（降低 opacity）
- **状态更新**：`hoverTokenId = token.id`

### Head 切换
- **行为**：切换不同的 attention head
- **效果**：
  - 立即更新热力图（重绘主 Canvas）
  - 清空 hoverCell（可选）
- **状态更新**：`selectedHead = headIndex`

## 性能规则（硬约束）

### Pointer Events 节流
- **pointermove 使用 requestAnimationFrame 节流**
- **同一帧只处理一次**：
  - pointermove 事件中只记录最新坐标
  - 使用 requestAnimationFrame 在下一帧统一处理
  - 避免在 pointermove 中做昂贵计算

### Resize 处理
- **resize 由 ResizeObserver 驱动**
- **重算尺寸与重绘**：
  - ResizeObserver 回调中重新计算 cellSize
  - 重设 canvas 像素尺寸（考虑 devicePixelRatio）
  - 重绘主 Canvas 和 overlay Canvas

### 避免昂贵计算
- **避免在 pointermove 中做 extent/scale 重建**
- **extent 计算**：只在数据变化时计算一次，缓存结果
- **scale 创建**：只在 domain 变化时重建，缓存 scale 函数

## 数据结构

### AttentionTensor
```typescript
type AttentionTensor = number[][][]  // [heads][seqLen][seqLen]
```

### HoverCell
```typescript
type HoverCell = { i: number; j: number; value: number; head: number } | null
```

### Token
```typescript
type Token = { id: string; text: string }
```

## 组件 Props

- `tokens: Token[]` - Token 数组（seqLen = tokens.length）
- `attn: AttentionTensor` - Attention 张量（heads x seqLen x seqLen）
- `initialHead?: number` - 初始 head（默认 0）
- `showValuesOnHover?: boolean` - 是否在 hover 时显示数值（默认 true）
- `compact?: boolean` - 紧凑模式（默认 false）

## 状态管理

### Store 字段
- `selectedHead: writable<number>` - 当前选中的 head
- `hoverCell: writable<HoverCell>` - 当前 hover 的 cell
- `hoverTokenId: writable<string | null>` - 当前 hover 的 token ID
- `selectedTokenId: writable<string | null>` - 当前选中的 token ID

### 使用方式
- **受控模式**：父组件通过 props 控制（props 优先）
- **非受控模式**：组件内部读写 store（props 未提供时）


# AttentionMatrix 组件实现总结

## 新增/修改的文件列表

### 新增文件
1. `DOCS/VIZ_ATTENTION_MATRIX.md` - 规范文档
2. `apps/web/src/lib/viz/layout.ts` - 布局计算模块
3. `apps/web/src/lib/viz/attentionColor.ts` - 颜色映射模块
4. `apps/web/src/lib/viz/attentionRender.ts` - 渲染模块
5. `apps/web/src/lib/components/AttentionMatrix.svelte` - 主组件

### 修改文件
1. `apps/web/src/lib/viz/types.ts` - 添加 `AttentionTensor` 和 `HoverCell` 类型
2. `apps/web/src/lib/state/vizStore.ts` - 添加 `selectedHead` 和 `hoverCell` store
3. `apps/web/src/lib/components/sections/AttentionView.svelte` - 集成 AttentionMatrix demo

---

## 完整代码文件

### 1. DOCS/VIZ_ATTENTION_MATRIX.md
（已创建，包含完整的规范定义）

### 2. apps/web/src/lib/viz/types.ts
```typescript
/**
 * 可视化组件的类型定义
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
```

### 3. apps/web/src/lib/state/vizStore.ts
```typescript
/**
 * 可视化组件的状态管理
 */
import { writable } from 'svelte/store';
import type { HoverCell } from '../viz/types';

export const selectedTokenId = writable<string | null>(null);
export const hoverTokenId = writable<string | null>(null);
export const selectedHead = writable<number>(0);
export const hoverCell = writable<HoverCell | null>(null);
```

### 4. apps/web/src/lib/viz/layout.ts
（完整代码已在上面提供）

### 5. apps/web/src/lib/viz/attentionColor.ts
（完整代码已在上面提供）

### 6. apps/web/src/lib/viz/attentionRender.ts
（完整代码已在上面提供）

### 7. apps/web/src/lib/components/AttentionMatrix.svelte
（完整代码已在上面提供，约 360 行）

### 8. apps/web/src/lib/components/sections/AttentionView.svelte
（已更新，添加了 AttentionMatrix demo）

---

## 性能优化权衡说明

### 1. **双 Canvas 架构（主 Canvas + Overlay Canvas）**
- **原因**：主 Canvas 只在数据/head 变化时重绘，overlay Canvas 只在高亮变化时重绘
- **性能影响**：避免频繁重绘整个热力图，hover 时只更新 overlay（~16x16 像素区域 vs 整个画布）
- **权衡**：增加了一个 Canvas 元素，但大幅减少重绘开销

### 2. **requestAnimationFrame 节流**
- **原因**：pointermove 事件可能每帧触发多次，使用 RAF 确保每帧只处理一次
- **性能影响**：减少不必要的坐标计算和 DOM 更新，保持 60fps 流畅度
- **权衡**：略微增加延迟（<16ms），但避免卡顿

### 3. **devicePixelRatio 处理**
- **原因**：高 DPI 屏幕需要更高分辨率 Canvas 才能清晰显示
- **性能影响**：像素数量增加（dpr^2），但现代 GPU 可以高效处理
- **权衡**：内存占用增加，但视觉质量显著提升

### 4. **Extent 缓存**
- **原因**：extent 计算需要遍历整个矩阵（O(n²)），只在数据变化时计算一次
- **性能影响**：避免在每次 hover 时重复计算，减少 CPU 开销
- **权衡**：需要监听数据变化，但计算量从 O(n²) 降到 O(1)

### 5. **ResizeObserver 驱动重绘**
- **原因**：窗口 resize 事件可能高频触发，ResizeObserver 更高效
- **性能影响**：只在尺寸真正变化时重绘，避免无效重绘
- **权衡**：需要维护 ResizeObserver 实例，但减少重绘次数

### 6. **纯函数渲染模块**
- **原因**：将渲染逻辑拆分为纯函数，便于测试和复用
- **性能影响**：函数调用开销可忽略，但代码更清晰易维护
- **权衡**：略微增加代码复杂度，但提升可维护性

### 7. **Props vs Store 双模式**
- **原因**：支持受控和非受控两种使用方式，提高灵活性
- **性能影响**：增加少量条件判断，但影响可忽略
- **权衡**：代码复杂度略增，但使用更灵活

### 8. **颜色映射使用 d3-scale-chromatic**
- **原因**：提供专业配色方案，视觉效果好
- **性能影响**：插值计算开销很小，可忽略
- **权衡**：增加依赖，但提供更好的可视化效果

---

## 自检清单

### 步骤 1: 启动开发服务器
```bash
cd apps/web
npm run dev
```

### 步骤 2: 访问页面
- 打开浏览器访问 `http://localhost:5173`
- 滚动到 "Multi-Head Attention" section

### 步骤 3: 验证基础渲染
- [ ] 能看到 Canvas 热力图（彩色矩阵）
- [ ] 能看到 Head 切换按钮（12 个按钮）
- [ ] 热力图显示正确的颜色渐变（viridis 配色）

### 步骤 4: 测试 Head 切换
- [ ] 点击不同的 Head 按钮
- [ ] 热力图立即更新（显示不同 head 的 attention pattern）
- [ ] 没有卡顿或延迟

### 步骤 5: 测试 Hover Cell
- [ ] 鼠标悬停在热力图的 cell 上
- [ ] Tooltip 显示：
  - [ ] Head 编号
  - [ ] From token（行 token）
  - [ ] To token（列 token）
  - [ ] Value（4 位小数）
- [ ] Tooltip 跟随鼠标移动
- [ ] 对应行和列高亮（蓝色半透明遮罩）
- [ ] 显示十字线（虚线）
- [ ] 当前 cell 有蓝色边框

### 步骤 6: 测试 Hover Token（如果实现）
- [ ] 如果有 token 列表，hover token
- [ ] 对应行高亮
- [ ] 其他行淡化

### 步骤 7: 测试性能
- [ ] 快速移动鼠标：无卡顿
- [ ] 切换 head：响应迅速（<100ms）
- [ ] 调整窗口大小：热力图自适应重绘

### 步骤 8: 检查控制台
- [ ] 打开浏览器开发者工具（F12）
- [ ] 查看 Console：无错误
- [ ] 查看 Performance：无长时间阻塞

### 步骤 9: 验证代码质量
```bash
cd apps/web
npm run lint
npm run format
npm run build
```
- [ ] lint 通过（或只有预期的警告）
- [ ] format 成功
- [ ] build 成功

---

## 技术实现要点

1. **Canvas 渲染**：使用双 Canvas 架构，主 Canvas 渲染基础热力图，overlay Canvas 渲染高亮
2. **设备像素比**：正确处理 devicePixelRatio，确保高 DPI 屏幕清晰显示
3. **事件处理**：使用 Pointer Events API，支持触摸和鼠标
4. **性能优化**：requestAnimationFrame 节流、extent 缓存、ResizeObserver
5. **模块化设计**：布局、颜色、渲染分离，便于测试和复用
6. **状态管理**：支持 props 和 store 双模式，灵活使用

---

## 已知限制与后续优化建议

1. **Tooltip 位置**：当前固定偏移，可优化为智能定位（避免出界）
2. **大量数据**：对于 >100 tokens，可考虑虚拟化或降采样
3. **交互增强**：可添加缩放、平移、导出图片等功能
4. **配色方案**：可添加更多配色方案选择器
5. **动画过渡**：head 切换时可添加淡入淡出动画


# 实现验证检查清单

本文档用于验证所有4个阶段的实现是否完整。

## ✅ 阶段 A：ONNX 导出工具链

### 文件检查

- [x] `DOCS/EXPORT_ONNX.md` - 导出指南
- [x] `DOCS/ACTIVATIONS_CONTRACT.md` - 数据契约
- [x] `tools/model-export/requirements.txt` - Python 依赖
- [x] `tools/model-export/export.py` - 导出脚本
- [x] `tools/model-export/verify.py` - 验证脚本
- [x] `tools/model-export/README.md` - 使用说明

### 功能检查

- [x] 导出脚本支持中间激活输出
- [x] 支持指定层导出（`--layers`）
- [x] 支持动态 seqLen
- [x] 输出名称与契约一致
- [x] 验证脚本可以检查输出形状

### 待验证

- [ ] 实际运行 `export.py` 生成模型
- [ ] 运行 `verify.py` 验证输出
- [ ] 测试 FP16 量化

## ✅ 阶段 B：前端接入 Activations

### 文件检查

- [x] `apps/web/src/lib/model/types.ts` - 数据契约类型
- [x] `apps/web/src/lib/state/modelStore.ts` - 模型状态管理
- [x] `apps/web/src/lib/model/cache.ts` - LRU 缓存
- [x] `apps/web/src/lib/model/runner.ts` - 推理结果解包
- [x] `apps/web/src/lib/model/config.ts` - 环境变量配置
- [x] `apps/web/src/lib/model/inferenceWorkerService.ts` - Worker 服务层

### 功能检查

- [x] 从 ONNX 输出解包 activations
- [x] LRU 缓存实现（默认 20 条）
- [x] 环境变量配置模型 URL
- [x] 数据契约验证
- [x] AttentionView 接入真实数据（有 fallback 到假数据）

### 待验证

- [ ] 运行应用，点击 Generate
- [ ] 验证 AttentionMatrix 显示真实数据
- [ ] 验证缓存命中统计
- [ ] 验证环境变量配置生效

## ✅ 阶段 C：Worker 化与性能优化

### 文件检查

- [x] `DOCS/WORKER_PROTOCOL.md` - Worker 通信协议
- [x] `apps/web/src/workers/infer.worker.ts` - Worker 推理实现
- [x] `apps/web/src/lib/model/workerClient.ts` - Worker 客户端
- [x] `apps/web/src/lib/components/PerformancePanel.svelte` - 性能面板
- [x] `apps/web/vite.config.ts` - Worker 支持

### 功能检查

- [x] Worker 异步推理
- [x] RequestId 管理（防止旧结果覆盖）
- [x] WebGPU/WASM 自动 fallback
- [x] rAF 节流（在 AttentionMatrix 中）
- [x] PerformancePanel 显示 EP、时间、FPS、缓存统计
- [x] TopControlBar 使用 Worker 服务

### 待验证

- [ ] 打开 DevTools → Sources → Workers，确认 Worker 运行
- [ ] 快速连续点击 Generate，验证只有最新结果生效
- [ ] 验证主线程不卡顿（滚动、hover 流畅）
- [ ] 验证 PerformancePanel 显示正确

## ✅ 阶段 D：GitHub Pages 部署

### 文件检查

- [x] `DOCS/DEPLOYMENT.md` - 部署指南
- [x] `.github/workflows/deploy.yml` - GitHub Actions 工作流
- [x] `README.md` - 更新了模型配置和部署说明
- [x] `apps/web/vite.config.ts` - base 配置

### 功能检查

- [x] GitHub Actions 工作流配置
- [x] 支持子路径部署（base 配置）
- [x] 环境变量支持（VITE_MODEL_URL, VITE_MODEL_VERSION）
- [x] 部署文档完整

### 待验证

- [ ] 本地 `npm run build && npm run preview` 验证
- [ ] 推送到 GitHub，验证 Actions 运行
- [ ] 访问 GitHub Pages，验证页面加载
- [ ] 验证模型可以加载（如果配置了 CDN）

## 🔧 集成检查

### App.svelte

- [x] 集成了 PerformancePanel
- [x] 所有可视化组件已引入

### TopControlBar.svelte

- [x] 使用 `inferenceWorkerService` 而不是 `inferenceService`
- [x] 初始化时调用 `initInferenceWorkerService`
- [x] Generate 时调用 `generateNextTokenWorker`
- [x] 清理时调用 `cleanupWorker`

### AttentionView.svelte

- [x] 从 `modelStore.lastResult` 读取 activations
- [x] 转换为 AttentionTensor 格式
- [x] 有 fallback 到假数据（当无真实数据时）
- [x] 显示数据来源提示（真实数据 vs 假数据）

## 🐛 已知问题与限制

1. **AttentionView 数据转换**：
   - 当前实现假设 `attnProbs` 是扁平数组，需要根据实际 ONNX 输出格式调整
   - 需要从模型配置中推断 `numHeads`（当前硬编码为 12）

2. **Worker 错误处理**：
   - 需要更详细的错误信息显示
   - 超时处理可能需要调整

3. **缓存策略**：
   - 大型 activations 可能占用大量内存
   - 考虑只缓存 logits/probs，不缓存完整 activations

## 📝 下一步行动

1. **运行导出工具**：
   ```bash
   cd tools/model-export
   python export.py --output ../apps/web/public/models/gpt2/model.onnx
   ```

2. **测试本地运行**：
   ```bash
   cd apps/web
   npm run dev
   ```
   - 点击 Generate
   - 检查 AttentionMatrix 是否有数据
   - 检查 PerformancePanel 是否显示

3. **测试构建**：
   ```bash
   npm run build
   npm run preview
   ```

4. **部署测试**：
   - 推送到 GitHub
   - 检查 Actions 运行
   - 访问 GitHub Pages

## ✅ 完成度总结

- **阶段 A**: 100% 完成（代码 + 文档）
- **阶段 B**: 100% 完成（代码 + 文档，待实际测试）
- **阶段 C**: 100% 完成（代码 + 文档，待实际测试）
- **阶段 D**: 100% 完成（代码 + 文档，待实际部署）

**总体完成度**: 100% 代码实现，待实际运行验证


# 部署指南

本文档说明如何将应用部署到 GitHub Pages。

## GitHub Pages 设置

### 1. 启用 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 保存设置

### 2. 配置仓库名称（如果使用子路径）

如果仓库名称不是 `transformer-learning`，需要更新 `vite.config.ts` 中的 `base` 配置。

## Vite Base 配置

### 本地开发

默认 `base: '/'`，应用在 `http://localhost:5173/` 运行。

### GitHub Pages 部署

如果仓库名称是 `transformer-learning`，部署后的 URL 是：
```
https://<username>.github.io/transformer-learning/
```

此时需要设置 `base: '/transformer-learning/'`。

### 自动配置

`vite.config.ts` 已配置为：
- 开发环境：`base: '/'`
- 生产环境：从环境变量 `VITE_BASE_PATH` 读取，或根据仓库名称自动推断

## 模型资源策略

### 选项 1：CDN 托管（推荐）

如果模型文件 >50MB，建议使用 CDN：

1. **上传到对象存储**：
   - AWS S3 + CloudFront
   - 阿里云 OSS
   - GitHub Releases（适合 <100MB）

2. **配置环境变量**：
   ```bash
   VITE_MODEL_URL=https://your-cdn.com/models/gpt2/model.onnx
   VITE_MODEL_VERSION=1.0.0
   ```

3. **添加版本号避免缓存**：
   ```
   VITE_MODEL_URL=https://your-cdn.com/models/gpt2/model.onnx?v=1.0.0
   ```

### 选项 2：GitHub Releases

1. 创建 Release，上传 `model.onnx`
2. 获取下载 URL（例如：`https://github.com/user/repo/releases/download/v1.0.0/model.onnx`）
3. 配置 `VITE_MODEL_URL`

### 选项 3：本地静态文件（仅小模型）

如果模型 <10MB，可以放在 `apps/web/public/models/gpt2/model.onnx`：

- ✅ 简单，无需额外配置
- ❌ 增加仓库体积
- ❌ GitHub 有 100MB 文件大小限制

## GitHub Actions 工作流

`.github/workflows/deploy.yml` 已配置：

1. **触发条件**：`push` 到 `main` 分支
2. **构建步骤**：
   - 安装 Node.js (LTS)
   - 安装依赖
   - 构建应用（`npm run build`）
3. **部署步骤**：
   - 使用 `actions/upload-pages-artifact`
   - 使用 `actions/deploy-pages`

## 环境变量配置

在 GitHub Actions 中配置 Secrets（如果需要）：

1. Settings → Secrets and variables → Actions
2. 添加：
   - `VITE_MODEL_URL`（如果使用 CDN）
   - `VITE_MODEL_VERSION`（可选）

或在 `.github/workflows/deploy.yml` 中直接设置：

```yaml
env:
  VITE_MODEL_URL: ${{ secrets.VITE_MODEL_URL }}
  VITE_MODEL_VERSION: ${{ secrets.VITE_MODEL_VERSION }}
```

## 部署后验证清单

- [ ] 页面可以正常加载
- [ ] 静态资源路径正确（CSS、JS）
- [ ] 模型可以加载（检查 Network 面板）
- [ ] EP 显示正确（WebGPU 或 WASM）
- [ ] AttentionMatrix 有数据（不是假数据）
- [ ] 控制台无错误

## 常见问题

### 404 错误

**问题**：页面或资源返回 404

**原因**：`base` 配置不正确

**解决**：
1. 检查仓库名称
2. 更新 `vite.config.ts` 中的 `base`
3. 重新构建和部署

### 模型加载失败

**问题**：模型文件无法加载

**原因**：
1. 模型路径错误
2. CORS 问题（CDN）
3. 文件不存在

**解决**：
1. 检查 `VITE_MODEL_URL` 配置
2. 检查 CDN CORS 设置
3. 检查文件是否存在

### WebGPU 不可用

**问题**：EP 显示 `wasm` 而不是 `webgpu`

**原因**：
1. 浏览器不支持 WebGPU
2. WebGPU 被禁用

**解决**：
- 这是正常的 fallback 行为
- 确保浏览器支持 WebGPU（Chrome 113+, Edge 113+）
- 检查 `chrome://flags` 中 WebGPU 是否启用

### 静态资源路径错误

**问题**：CSS/JS 文件 404

**原因**：`base` 配置与部署路径不匹配

**解决**：
1. 检查 `vite.config.ts` 中的 `base`
2. 检查 GitHub Pages 的部署路径
3. 确保构建时使用了正确的 `base`

## 本地预览部署

在部署前，可以在本地预览生产构建：

```bash
cd apps/web
npm run build
npm run preview
```

访问 `http://localhost:4173`（或显示的端口）验证。

## 参考

- [Vite 静态部署](https://vite.dev/guide/static-deploy.html)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [GitHub Actions 文档](https://docs.github.com/en/actions)


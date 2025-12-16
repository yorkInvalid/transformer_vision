# ONNX 模型导出指南

## 概述

本文档说明如何从 PyTorch 模型导出带中间激活（activations）的 ONNX 模型，用于前端可视化。

## 导出目标

导出的 ONNX 模型需要包含：
- **logits**: 最终输出，用于 token 采样
- **activations**: 中间层输出，用于可视化（attention weights、embeddings、MLP 输出等）

## 导出策略

### 1. 激活输出范围控制

默认导出**最后一层**的激活，以控制文件体积。可通过配置导出更多层：

- `--layers`: 指定要导出的层索引（例如：`--layers 0,5,11` 导出第 0、5、11 层）
- `--all-layers`: 导出所有层（不推荐，文件会很大）

### 2. 模型体积优化

#### 方案 A：FP16 量化（推荐）

使用 ONNX Runtime 的 `convert_float_to_float16` 工具：

```bash
python -m onnxruntime.tools.convert_float_to_float16 \
  --input_model model.onnx \
  --output_model model_fp16.onnx
```

预期体积减少约 50%。

#### 方案 B：int8 量化（实验性）

使用 ONNX Runtime 的量化工具（需要校准数据）：

```bash
# 需要准备校准数据集
python -m onnxruntime.quantization.quantize \
  --input_model model.onnx \
  --output_model model_int8.onnx \
  --quantization_type QInt8
```

注意：int8 量化可能影响精度，建议先测试。

### 3. 导出产物位置

默认输出路径：
- **开发环境**: `apps/web/static/models/gpt2/model.onnx`
- **生产环境**: 建议使用 CDN 托管（见下方）

#### CDN 托管方案

如果模型文件过大（>50MB），不建议提交到 Git 仓库：

1. 上传到对象存储（如 AWS S3、阿里云 OSS、GitHub Releases）
2. 在环境变量中配置 `VITE_MODEL_URL`：
   ```bash
   VITE_MODEL_URL=https://your-cdn.com/models/gpt2/model.onnx
   ```
3. 添加版本号避免缓存问题：
   ```
   VITE_MODEL_URL=https://your-cdn.com/models/gpt2/model.onnx?v=1.0.0
   ```

## 使用导出工具

### 环境准备

```bash
cd tools/model-export
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 运行导出

```bash
# 基本导出（最后一层）
python export.py

# 导出指定层
python export.py --layers 0,5,11

# 导出所有层（不推荐）
python export.py --all-layers

# 指定输出路径
python export.py --output apps/web/static/models/gpt2/model.onnx
```

### 验证导出结果

```bash
# 使用 onnxruntime 验证
python export.py --verify

# 或单独运行验证脚本
python verify.py --model apps/web/static/models/gpt2/model.onnx
```

验证脚本会：
1. 加载 ONNX 模型
2. 使用 dummy input 运行一次推理
3. 打印所有输出的 name、shape、dtype
4. 与 `ACTIVATIONS_CONTRACT.md` 中的契约对比

## 模型准备

### 选项 1：使用预训练权重（推荐）

从 HuggingFace 下载 GPT-2 权重：

```bash
# 使用 transformers 库
python -c "from transformers import GPT2LMHeadModel; model = GPT2LMHeadModel.from_pretrained('gpt2'); model.save_pretrained('./models/gpt2')"
```

### 选项 2：使用本地权重文件

将权重文件放在 `tools/model-export/models/gpt2/` 目录下，确保包含：
- `pytorch_model.bin` 或 `model.safetensors`
- `config.json`

## 常见问题

### Q: 导出失败，提示 "ONNX export failed"

A: 检查：
1. PyTorch 版本 >= 1.12
2. 模型是否包含不支持的操作（如自定义 CUDA kernel）
3. 尝试设置 `opset_version=14` 或更高

### Q: 导出的模型文件太大

A: 
1. 使用 FP16 量化（见上方）
2. 减少导出的层数（只导出最后一层）
3. 考虑使用 CDN 托管

### Q: 前端加载模型失败

A: 检查：
1. 模型路径是否正确（`VITE_MODEL_URL` 或默认路径）
2. 浏览器控制台的错误信息
3. 模型是否包含所有必需的输出（见 `ACTIVATIONS_CONTRACT.md`）

## 参考

- [PyTorch ONNX 导出文档](https://pytorch.org/docs/stable/onnx.html)
- [ONNX Runtime 量化工具](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html)
- [HuggingFace GPT-2 模型](https://huggingface.co/openai-community/gpt2)


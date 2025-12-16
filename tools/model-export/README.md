# ONNX 模型导出工具

## 快速开始

### 1. 安装依赖

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 准备模型权重（二选一）

#### 选项 A：从 HuggingFace 自动下载（推荐）

```bash
python export.py
```

首次运行会自动下载 GPT-2 权重。

#### 选项 B：使用本地权重

将权重文件放在 `models/gpt2/` 目录下：
- `pytorch_model.bin` 或 `model.safetensors`
- `config.json`

然后运行：
```bash
python export.py --model-path models/gpt2
```

### 3. 导出模型

```bash
# 基本导出（最后一层）
python export.py

# 导出指定层
python export.py --layers 0,5,11

# 导出所有层（不推荐，文件很大）
python export.py --all-layers

# 指定输出路径
python export.py --output ../apps/web/static/models/gpt2/model.onnx
```

### 4. 验证导出结果

```bash
python export.py --verify
```

或单独运行验证：

```bash
python verify.py --model ../apps/web/static/models/gpt2/model.onnx
```

## 参数说明

- `--model-path`: 模型权重路径（默认：从 HuggingFace 下载）
- `--output`: 输出 ONNX 文件路径（默认：`out/model.onnx`）
- `--layers`: 要导出的层索引，逗号分隔（例如：`0,5,11`）
- `--all-layers`: 导出所有层（不推荐）
- `--opset`: ONNX opset 版本（默认：14）
- `--verify`: 导出后自动验证

## 输出文件

- `model.onnx`: 导出的 ONNX 模型
- `model_fp16.onnx`: FP16 量化版本（如果启用）

## 注意事项

1. **文件体积**: 完整模型可能 >100MB，建议使用 FP16 量化或只导出最后一层
2. **浏览器兼容**: 确保导出的 opset 版本与 onnxruntime-web 兼容
3. **动态形状**: 导出时已设置 `seq_len` 为动态维度，支持不同长度的输入

## 故障排查

### 导出失败

- 检查 PyTorch 版本 >= 2.0
- 检查 transformers 版本 >= 4.30
- 查看错误日志中的具体错误信息

### 验证失败

- 检查输出张量名称是否与 `ACTIVATIONS_CONTRACT.md` 一致
- 检查形状是否正确（特别是 batch 维度）

### 前端加载失败

- 检查模型路径配置（`VITE_MODEL_URL`）
- 检查浏览器控制台错误
- 确认模型包含必需的输出（`logits` + 至少一个 `layer_{L}_attn_probs`）


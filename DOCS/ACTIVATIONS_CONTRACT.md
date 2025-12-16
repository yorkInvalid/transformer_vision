# Activations 数据契约

本文档定义 ONNX 模型输出的 activations 张量的名称、形状和语义，前端代码将严格依赖此契约。

## 输出张量列表

### 必需输出

#### 1. `logits`
- **dtype**: `float32`
- **shape**: `[batch_size, seq_len, vocab_size]` 或 `[seq_len, vocab_size]`
- **语义**: 未归一化的 token 概率分布，用于采样下一个 token
- **用途**: Token 生成、概率可视化

### 激活输出（至少包含一层）

#### 2. `embedding_sum`
- **dtype**: `float32`
- **shape**: `[batch_size, seq_len, hidden_size]` 或 `[seq_len, hidden_size]`
- **语义**: Token embeddings + positional embeddings 的和
- **用途**: Embedding 可视化、token 向量分析

#### 3. `layer_{L}_attn_probs`
- **dtype**: `float32`
- **shape**: `[batch_size, num_heads, seq_len, seq_len]` 或 `[num_heads, seq_len, seq_len]`
- **语义**: 第 L 层的 attention 权重矩阵（softmax 后），值域 [0, 1]
- **用途**: Attention Matrix 可视化
- **示例**: `layer_0_attn_probs`, `layer_5_attn_probs`, `layer_11_attn_probs`

#### 4. `layer_{L}_qkv` (可选，三选一)
- **dtype**: `float32`
- **shape**: `[batch_size, num_heads, seq_len, head_dim * 3]` 或 `[num_heads, seq_len, head_dim * 3]`
- **语义**: Q、K、V 的拼接结果（可选输出，用于高级分析）
- **用途**: QKV 向量分析

**或**

#### 4a. `layer_{L}_q` / `layer_{L}_k` / `layer_{L}_v` (可选)
- **dtype**: `float32`
- **shape**: `[batch_size, num_heads, seq_len, head_dim]` 或 `[num_heads, seq_len, head_dim]`
- **语义**: 分别输出 Q、K、V（更灵活但输出更多）
- **用途**: QKV 向量分析

#### 5. `layer_{L}_mlp_output`
- **dtype**: `float32`
- **shape**: `[batch_size, seq_len, hidden_size]` 或 `[seq_len, hidden_size]`
- **语义**: 第 L 层的 MLP（Feed-Forward）输出
- **用途**: MLP 可视化、激活值分析
- **示例**: `layer_0_mlp_output`, `layer_5_mlp_output`, `layer_11_mlp_output`

#### 6. `layer_{L}_mlp_fc1` / `layer_{L}_mlp_gelu` / `layer_{L}_mlp_fc2` (可选)
- **dtype**: `float32`
- **shape**: `[batch_size, seq_len, intermediate_size]` 或 `[seq_len, intermediate_size]`
- **语义**: MLP 的中间层输出（用于更细粒度的可视化）
- **用途**: MLP 内部激活分析

## 形状约定

### Batch 维度

- **有 batch**: `[batch_size, ...]`，batch_size 通常为 1
- **无 batch**: `[...]`（导出时去掉 batch 维度）

前端代码需要兼容两种情况。

### 序列长度

- **动态**: `seq_len` 维度可以是任意值（ONNX 导出时使用 `dynamic_axes`）
- **前端处理**: 从实际输入 `inputIds` 的长度推断

## 层索引约定

- **从 0 开始**: 第一层为 `layer_0`
- **最后一层**: 如果模型有 12 层，最后一层为 `layer_11`
- **导出范围**: 默认只导出最后一层（`layer_11`），可通过配置导出更多层

## 前端使用示例

```typescript
// 从 ONNX 输出字典中提取 activations
const activations: ActivationTensors = {
  embedding: outputs['embedding_sum'], // [seq_len, hidden]
  layers: []
};

// 遍历所有层
for (let L = 0; L < numLayers; L++) {
  const attnProbs = outputs[`layer_${L}_attn_probs`];
  if (attnProbs) {
    activations.layers.push({
      layerIndex: L,
      attnProbs: attnProbs, // [num_heads, seq_len, seq_len]
      mlpOutput: outputs[`layer_${L}_mlp_output`]
    });
  }
}
```

## 验证清单

导出后验证脚本会检查：

- [ ] `logits` 存在且形状正确
- [ ] 至少有一个 `layer_{L}_attn_probs` 输出
- [ ] `embedding_sum` 存在（如果导出）
- [ ] 所有输出的 dtype 为 `float32`
- [ ] 形状维度与契约一致

## 版本兼容性

- **v1.0**: 基础契约（logits + 最后一层 attn_probs）
- **v1.1**: 添加 embedding_sum（计划）
- **v1.2**: 添加 MLP 输出（计划）

前端代码应检查 `modelVersion` 并优雅降级（如果某些输出不存在）。


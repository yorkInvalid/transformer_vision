# Worker 通信协议

本文档定义主线程与 Worker 之间的消息协议，用于模型推理的 Worker 化。

## Message Types

### 1. `init` - 初始化模型

**主线程 → Worker**

```typescript
{
  type: 'init';
  payload: {
    modelUrl: string;
    preferWebGPU: boolean;
    modelVersion: string;
  };
}
```

**Worker → 主线程**

成功：
```typescript
{
  type: 'init_success';
  payload: {
    ep: 'webgpu' | 'wasm';
    loadTimeMs: number;
  };
}
```

失败：
```typescript
{
  type: 'error';
  payload: {
    code: 'MODEL_LOAD_FAIL' | 'EP_NOT_SUPPORTED';
    message: string;
    detail?: any;
  };
}
```

### 2. `run` - 执行推理

**主线程 → Worker**

```typescript
{
  type: 'run';
  payload: {
    requestId: string; // Unique request ID
    inputIds: number[];
    params: {
      temperature: number;
      samplingMode: 'top-k' | 'top-p';
      topK: number;
      topP: number;
    };
  };
}
```

**Worker → 主线程**

成功：
```typescript
{
  type: 'result';
  payload: {
    requestId: string;
    result: ModelRunResult; // See types.ts
  };
}
```

失败：
```typescript
{
  type: 'error';
  payload: {
    requestId: string;
    code: 'INFER_FAIL' | 'BAD_OUTPUT_SHAPE' | 'TOKENIZER_NOT_READY';
    message: string;
    detail?: any;
  };
}
```

### 3. `cancel` - 取消请求（可选）

**主线程 → Worker**

```typescript
{
  type: 'cancel';
  payload: {
    requestId: string;
  };
}
```

## Error Codes

| Code | Description | When |
|------|-------------|------|
| `MODEL_LOAD_FAIL` | 模型加载失败 | init 时模型文件无法加载 |
| `EP_NOT_SUPPORTED` | 执行提供者不支持 | WebGPU 不可用且 WASM 也失败 |
| `INFER_FAIL` | 推理执行失败 | run 时 ONNX Runtime 报错 |
| `BAD_OUTPUT_SHAPE` | 输出形状不匹配 | 输出张量形状与契约不符 |
| `TOKENIZER_NOT_READY` | Tokenizer 未就绪 | run 时 tokenizer 未初始化 |
| `TIMEOUT` | 请求超时 | 推理超过 30 秒 |
| `CANCELLED` | 请求已取消 | 用户取消或新请求覆盖 |
| `UNKNOWN_ERROR` | 未知错误 | 其他未分类错误 |

## Cancellation / Superseding Strategy

### 策略：只保留最新请求

1. **主线程侧**：
   - 每次 `run` 生成新的 `requestId`（UUID 或递增计数器）
   - 如果已有进行中的请求，不取消旧请求，但忽略其响应
   - 使用 `requestId` 匹配响应，只处理匹配的响应

2. **Worker 侧**：
   - 不主动取消旧请求（让 ONNX Runtime 自然完成）
   - 如果收到新的 `run`，标记旧请求为 "superseded"
   - 返回结果时检查是否已被 superseded，如果是则不发送响应

### 实现示例

```typescript
// 主线程
let currentRequestId: string | null = null;

async function runInference(inputIds: number[]) {
  const requestId = generateRequestId();
  currentRequestId = requestId;
  
  worker.postMessage({
    type: 'run',
    payload: { requestId, inputIds, params }
  });
  
  // 处理响应时检查
  worker.onmessage = (e) => {
    if (e.data.type === 'result' && e.data.payload.requestId === currentRequestId) {
      // 处理结果
    }
  };
}
```

## Timeout Handling

- **默认超时**: 30 秒（可配置）
- **超时处理**: 主线程设置定时器，超时后发送 `cancel` 并显示错误
- **Worker 侧**: 不主动超时，由主线程控制

## 性能考虑

1. **Transferable Objects**: 大型数组使用 `Transferable` 避免复制
   ```typescript
   worker.postMessage({ data: largeArray }, [largeArray.buffer]);
   ```

2. **批量传输**: 如果可能，批量传输多个张量

3. **压缩**: 对于大型 activations，考虑压缩（但会增加 CPU 开销）

## 版本兼容性

- **v1.0**: 基础协议（init + run）
- **v1.1**: 添加 cancel（计划）
- **v1.2**: 添加进度报告（计划）


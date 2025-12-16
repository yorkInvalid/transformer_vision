# Model Directory

Place your ONNX model file here.

## File Name

- Default: `model.onnx`
- Configure path in: `apps/web/src/lib/model/config.ts`

## Model Requirements

- Input tensor name: `input_ids` (or configure in `config.ts`)
- Output tensor name: `logits` (or configure in `config.ts`)
- Input shape: `[batch_size, sequence_length]` or `[sequence_length]`
- Output shape: `[batch_size, sequence_length, vocab_size]` or `[sequence_length, vocab_size]`

## CDN Deployment

For production, you can configure a CDN URL in `config.ts`:

```typescript
modelPath: 'https://cdn.example.com/models/model.onnx'
```


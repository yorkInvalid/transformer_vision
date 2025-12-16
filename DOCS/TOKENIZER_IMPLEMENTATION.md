# GPT-2 BPE Tokenizer Implementation

## Overview

This document describes the GPT-2 compatible BPE (Byte Pair Encoding) tokenizer implementation for browser-side text tokenization.

## Architecture

### Module Structure

```
apps/web/src/lib/model/tokenizer/
├── bpe.ts              # BPE tokenizer core implementation
├── loader.ts           # Resource loading and caching
└── index.ts            # Module entry point
```

## Implementation Details

### 1. BPE Tokenizer (`bpe.ts`)

- **Encoding**: Text → Token IDs
- **Decoding**: Token IDs → Text
- **Tokenization with Offsets**: Returns tokens with character positions for visualization

#### Key Features

- **Byte Pair Encoding**: Implements GPT-2's BPE algorithm
- **Byte-to-Unicode Mapping**: Handles byte encoding/decoding
- **Special Tokens**: Supports BOS, EOS, UNK, PAD tokens
- **Offset Tracking**: Provides character positions for UI visualization

### 2. Resource Loader (`loader.ts`)

- **Dual Format Support**: 
  - `vocab.json` + `merges.txt` (GPT-2 format)
  - `tokenizer.json` (HuggingFace format)
- **Caching Strategy**:
  - Memory cache (immediate reuse)
  - CacheStorage (persistent across sessions, optional)
- **Error Handling**: Clear error messages with fallback

### 3. Configuration

Default paths in `apps/web/src/lib/model/config.ts`:

```typescript
export const DEFAULT_TOKENIZER_CONFIG = {
  vocabPath: 'models/gpt2/vocab.json',
  mergesPath: 'models/gpt2/merges.txt',
  useCacheStorage: true,
  cacheVersion: '1',
};
```

## Usage

### Initialization

```typescript
import { initTokenizer } from './lib/model/tokenizer';

const tokenizer = await initTokenizer({
  baseUrl: '/',
  useCacheStorage: true,
  cacheVersion: '1',
}, 'models/gpt2/vocab.json', 'models/gpt2/merges.txt');
```

### Encoding

```typescript
const text = "Hello, world!";
const tokenIds = tokenizer.encode(text);
// Returns: [15496, 11, 995, 0]
```

### Decoding

```typescript
const tokenIds = [15496, 11, 995, 0];
const text = tokenizer.decode(tokenIds);
// Returns: "Hello, world!"
```

### Tokenization with Offsets

```typescript
const tokens = tokenizer.tokenizeWithOffsets("Hello, world!");
// Returns: [
//   { id: 15496, text: "Hello", start: 0, end: 5 },
//   { id: 11, text: ",", start: 5, end: 6 },
//   ...
// ]
```

## Caching Strategy

### Memory Cache

- Stores loaded resources in memory
- Immediate reuse within the same session
- Cleared on page reload

### CacheStorage (Optional)

- Persistent cache across browser sessions
- Versioned cache (configurable via `cacheVersion`)
- Automatically used if available

### Cache Invalidation

- Update `cacheVersion` in config to invalidate cache
- Or call `clearTokenizerCache()` to clear memory cache

## Integration with Inference

The tokenizer is integrated with the inference service:

1. **Input Encoding**: `inputText` → `encode()` → `inputIds`
2. **Output Decoding**: `outputIds` → `decode()` → `outputText`
3. **Visualization**: `tokenizeWithOffsets()` provides token positions for UI

## Error Handling

### Resource Loading Errors

- **Network Error**: Shows error message in UI
- **Invalid Format**: Throws descriptive error
- **Fallback**: Memory cache provides basic fallback

### UI Error Display

- Tokenizer loading errors shown in status bar
- Auto-dismiss after 5 seconds
- Stored in `inferenceStore.tokenizerError`

## Testing & Validation

### Encode-Decode Consistency

```typescript
const text = "The quick brown fox jumps over the lazy dog.";
const encoded = tokenizer.encode(text);
const decoded = tokenizer.decode(encoded);
console.assert(text === decoded, "Encode-decode mismatch");
```

### Cache Verification

1. **First Load**: Check Network tab for fetch requests
2. **Second Load**: Should use cache (no network requests)
3. **CacheStorage**: Check Application → Cache Storage in DevTools

### Error Handling

1. **Invalid Path**: Should show error in UI
2. **Network Failure**: Should show error message
3. **Invalid Format**: Should throw descriptive error

## Resource Requirements

### File Sizes (GPT-2)

- `vocab.json`: ~1.2 MB (50,257 tokens)
- `merges.txt`: ~500 KB (50,256 merges)
- `tokenizer.json`: ~1.5 MB (combined)

### Loading Performance

- **First Load**: ~100-500ms (depending on network)
- **Cached Load**: <10ms (memory cache)
- **CacheStorage Load**: ~20-50ms

## Limitations & TODOs

### Current Limitations

1. **Text Splitting**: Simplified regex (not exact GPT-2 pattern)
   - TODO: Implement full GPT-2 regex pattern

2. **Byte Encoding**: Simplified byte-to-unicode mapping
   - TODO: Implement exact GPT-2 byte encoder

3. **Offset Accuracy**: Approximate offsets for some tokens
   - TODO: Improve offset tracking during encoding

### Future Enhancements

- Support for other tokenizer formats (SentencePiece, etc.)
- Web Worker support for large vocabularies
- Streaming tokenization for long texts
- Tokenizer versioning and migration

## References

- [GPT-2 Tokenizer (OpenAI)](https://github.com/openai/gpt-2)
- [HuggingFace Tokenizers](https://huggingface.co/docs/tokenizers)
- [BPE Algorithm](https://huggingface.co/docs/tokenizers/algorithm/bpe)


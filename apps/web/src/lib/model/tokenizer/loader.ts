/**
 * Tokenizer resource loader
 * Handles loading vocab.json, merges.txt, or tokenizer.json
 * Implements caching strategies (memory + CacheStorage)
 */

export interface TokenizerResources {
  vocab: Record<string, number>;
  merges: string[];
  specialTokens?: {
    bos?: string;
    eos?: string;
    unk?: string;
    pad?: string;
  };
}

export interface LoaderConfig {
  baseUrl?: string;
  useCacheStorage?: boolean;
  cacheVersion?: string;
}

// Memory cache
const memoryCache = new Map<string, TokenizerResources>();

/**
 * Load tokenizer resources from vocab.json and merges.txt
 */
async function loadFromVocabAndMerges(
  vocabUrl: string,
  mergesUrl: string,
  config: LoaderConfig
): Promise<TokenizerResources> {
  // Check memory cache first
  const cacheKey = `vocab+merges:${vocabUrl}:${mergesUrl}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check CacheStorage if enabled
  if (config.useCacheStorage && 'caches' in window) {
    const cacheName = `tokenizer-v${config.cacheVersion || '1'}`;
    try {
      const cache = await caches.open(cacheName);
      const cachedVocab = await cache.match(vocabUrl);
      const cachedMerges = await cache.match(mergesUrl);

      if (cachedVocab && cachedMerges) {
        const vocab = await cachedVocab.json();
        const mergesText = await cachedMerges.text();
        const merges = mergesText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));

        const resources: TokenizerResources = { vocab, merges };
        memoryCache.set(cacheKey, resources);
        return resources;
      }
    } catch (error) {
      console.warn('CacheStorage access failed, falling back to fetch:', error);
    }
  }

  // Fetch resources
  const [vocabResponse, mergesResponse] = await Promise.all([
    fetch(vocabUrl),
    fetch(mergesUrl),
  ]);

  // Clone responses *before* the body streams are consumed so that we can
  // safely store them in CacheStorage later. Once a Response body is read,
  // it cannot be cloned or reused.
  const vocabResponseForCache = config.useCacheStorage && 'caches' in window
    ? vocabResponse.clone()
    : null;
  const mergesResponseForCache = config.useCacheStorage && 'caches' in window
    ? mergesResponse.clone()
    : null;

  if (!vocabResponse.ok) {
    throw new Error(`Failed to load vocab.json: ${vocabResponse.statusText}`);
  }
  if (!mergesResponse.ok) {
    throw new Error(`Failed to load merges.txt: ${mergesResponse.statusText}`);
  }

  const vocab = await vocabResponse.json();
  const mergesText = await mergesResponse.text();
  const merges = mergesText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const resources: TokenizerResources = { vocab, merges };

  // Store in memory cache
  memoryCache.set(cacheKey, resources);

  // Store in CacheStorage if enabled
  if (config.useCacheStorage && 'caches' in window && vocabResponseForCache && mergesResponseForCache) {
    const cacheName = `tokenizer-v${config.cacheVersion || '1'}`;
    try {
      const cache = await caches.open(cacheName);
      await Promise.all([
        cache.put(vocabUrl, vocabResponseForCache),
        cache.put(mergesUrl, mergesResponseForCache),
      ]);
    } catch (error) {
      console.warn('Failed to store in CacheStorage:', error);
    }
  }

  return resources;
}

/**
 * Load tokenizer resources from tokenizer.json (HuggingFace format)
 */
async function loadFromTokenizerJson(
  tokenizerUrl: string,
  config: LoaderConfig
): Promise<TokenizerResources> {
  // Check memory cache
  const cacheKey = `tokenizer.json:${tokenizerUrl}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check CacheStorage
  if (config.useCacheStorage && 'caches' in window) {
    const cacheName = `tokenizer-v${config.cacheVersion || '1'}`;
    try {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(tokenizerUrl);
      if (cached) {
        const tokenizerData = await cached.json();
        const resources = parseTokenizerJson(tokenizerData);
        memoryCache.set(cacheKey, resources);
        return resources;
      }
    } catch (error) {
      console.warn('CacheStorage access failed:', error);
    }
  }

  // Fetch tokenizer.json
  const response = await fetch(tokenizerUrl);
  if (!response.ok) {
    throw new Error(`Failed to load tokenizer.json: ${response.statusText}`);
  }

  const tokenizerData = await response.json();
  const resources = parseTokenizerJson(tokenizerData);

  // Store in memory cache
  memoryCache.set(cacheKey, resources);

  // Store in CacheStorage
  if (config.useCacheStorage && 'caches' in window) {
    const cacheName = `tokenizer-v${config.cacheVersion || '1'}`;
    try {
      const cache = await caches.open(cacheName);
      await cache.put(tokenizerUrl, response.clone());
    } catch (error) {
      console.warn('Failed to store in CacheStorage:', error);
    }
  }

  return resources;
}

/**
 * Parse HuggingFace tokenizer.json format
 */
function parseTokenizerJson(data: any): TokenizerResources {
  // Handle different tokenizer.json formats
  if (data.vocab && data.merges) {
    // Direct vocab + merges
    return {
      vocab: data.vocab,
      merges: Array.isArray(data.merges) ? data.merges : [],
      specialTokens: data.added_tokens?.reduce(
        (acc: any, token: any) => {
          if (token.special) {
            if (token.content === '<|endoftext|>') acc.eos = token.content;
            if (token.content === '<|endoftext|>') acc.bos = token.content; // GPT-2 uses same token
            if (token.content === '<|unk|>') acc.unk = token.content;
            if (token.content === '<|pad|>') acc.pad = token.content;
          }
          return acc;
        },
        {}
      ),
    };
  }

  // Handle model field (nested structure)
  if (data.model && data.model.vocab && data.model.merges) {
    return {
      vocab: data.model.vocab,
      merges: Array.isArray(data.model.merges) ? data.model.merges : [],
      specialTokens: data.added_tokens?.reduce(
        (acc: any, token: any) => {
          if (token.special) {
            if (token.content === '<|endoftext|>') acc.eos = token.content;
            if (token.content === '<|endoftext|>') acc.bos = token.content;
            if (token.content === '<|unk|>') acc.unk = token.content;
            if (token.content === '<|pad|>') acc.pad = token.content;
          }
          return acc;
        },
        {}
      ),
    };
  }

  throw new Error('Invalid tokenizer.json format');
}

/**
 * Initialize tokenizer by loading resources
 * @param config - Loader configuration
 * @param vocabPath - Path to vocab.json (optional, if using tokenizer.json)
 * @param mergesPath - Path to merges.txt (optional, if using tokenizer.json)
 * @param tokenizerPath - Path to tokenizer.json (optional, alternative to vocab+merges)
 */
export async function loadTokenizerResources(
  config: LoaderConfig = {},
  vocabPath?: string,
  mergesPath?: string,
  tokenizerPath?: string
): Promise<TokenizerResources> {
  const baseUrl = config.baseUrl || '/';
  // Normalize baseUrl: ensure it ends with '/' if not empty
  const normalizedBase = baseUrl && !baseUrl.endsWith('/') ? `${baseUrl}/` : baseUrl;

  try {
    // Try tokenizer.json first if provided
    if (tokenizerPath) {
      const tokenizerUrl = tokenizerPath.startsWith('http')
        ? tokenizerPath
        : `${normalizedBase}${tokenizerPath.startsWith('/') ? tokenizerPath.slice(1) : tokenizerPath}`;
      return await loadFromTokenizerJson(tokenizerUrl, config);
    }

    // Otherwise use vocab.json + merges.txt
    if (!vocabPath || !mergesPath) {
      throw new Error('Either tokenizer.json or both vocab.json and merges.txt must be provided');
    }

    const vocabUrl = vocabPath.startsWith('http')
      ? vocabPath
      : `${normalizedBase}${vocabPath.startsWith('/') ? vocabPath.slice(1) : vocabPath}`;
    const mergesUrl = mergesPath.startsWith('http')
      ? mergesPath
      : `${normalizedBase}${mergesPath.startsWith('/') ? mergesPath.slice(1) : mergesPath}`;

    return await loadFromVocabAndMerges(vocabUrl, mergesUrl, config);
  } catch (error) {
    throw new Error(
      `Failed to load tokenizer resources: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear tokenizer cache
 */
export function clearTokenizerCache(): void {
  memoryCache.clear();
}


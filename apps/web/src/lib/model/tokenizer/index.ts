/**
 * Tokenizer module entry point
 * Exports GPT-2 BPE tokenizer and initialization functions
 */

export { GPT2Tokenizer, type TokenizerConfig, type TokenWithOffset } from './bpe';
export {
  loadTokenizerResources,
  clearTokenizerCache,
  type TokenizerResources,
  type LoaderConfig,
} from './loader';

import { GPT2Tokenizer, type TokenizerConfig } from './bpe';
import { loadTokenizerResources, type LoaderConfig } from './loader';

/**
 * Initialize GPT-2 tokenizer
 * @param config - Loader configuration
 * @param vocabPath - Path to vocab.json
 * @param mergesPath - Path to merges.txt
 * @param tokenizerPath - Path to tokenizer.json (alternative)
 */
export async function initTokenizer(
  config: LoaderConfig = {},
  vocabPath?: string,
  mergesPath?: string,
  tokenizerPath?: string
): Promise<GPT2Tokenizer> {
  const resources = await loadTokenizerResources(
    config,
    vocabPath,
    mergesPath,
    tokenizerPath
  );

  const tokenizerConfig: TokenizerConfig = {
    vocab: resources.vocab,
    merges: resources.merges,
    specialTokens: resources.specialTokens || {
      bos: '<|endoftext|>',
      eos: '<|endoftext|>',
      unk: '<|unk|>',
    },
  };

  return new GPT2Tokenizer(tokenizerConfig);
}


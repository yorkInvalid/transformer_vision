/**
 * Tokenizer test utilities
 * For browser console testing
 */

import { initTokenizer } from './index';
import type { GPT2Tokenizer } from './bpe';

/**
 * Test encode-decode consistency
 */
export async function testEncodeDecode(
  tokenizer: GPT2Tokenizer,
  text: string
): Promise<boolean> {
  try {
    const encoded = tokenizer.encode(text);
    const decoded = tokenizer.decode(encoded);
    const isConsistent = text === decoded;
    
    console.log('Encode-Decode Test:', {
      input: text,
      encoded: encoded,
      decoded: decoded,
      consistent: isConsistent,
    });
    
    return isConsistent;
  } catch (error) {
    console.error('Encode-Decode Test Failed:', error);
    return false;
  }
}

/**
 * Test tokenization with offsets
 */
export function testTokenizeWithOffsets(
  tokenizer: GPT2Tokenizer,
  text: string
): void {
  try {
    const tokens = tokenizer.tokenizeWithOffsets(text);
    console.log('TokenizeWithOffsets Test:', {
      input: text,
      tokens: tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error('TokenizeWithOffsets Test Failed:', error);
  }
}

/**
 * Test cache behavior
 */
export async function testCache(
  baseUrl: string = '/',
  vocabPath?: string,
  mergesPath?: string
): Promise<void> {
  console.log('Cache Test: Loading tokenizer twice...');
  
  const start1 = performance.now();
  const tokenizer1 = await initTokenizer({ baseUrl }, vocabPath, mergesPath);
  const time1 = performance.now() - start1;
  console.log(`First load: ${time1.toFixed(2)}ms`);
  
  const start2 = performance.now();
  const tokenizer2 = await initTokenizer({ baseUrl }, vocabPath, mergesPath);
  const time2 = performance.now() - start2;
  console.log(`Second load (cached): ${time2.toFixed(2)}ms`);
  
  console.log('Cache Test:', {
    firstLoad: `${time1.toFixed(2)}ms`,
    secondLoad: `${time2.toFixed(2)}ms`,
    speedup: `${(time1 / time2).toFixed(2)}x`,
    cached: time2 < time1 / 2, // Should be much faster if cached
  });
}

/**
 * Run all tests
 */
export async function runAllTests(
  baseUrl: string = '/',
  vocabPath?: string,
  mergesPath?: string
): Promise<void> {
  console.log('=== Tokenizer Tests ===');
  
  try {
    // Load tokenizer
    console.log('Loading tokenizer...');
    const tokenizer = await initTokenizer({ baseUrl }, vocabPath, mergesPath);
    console.log('Tokenizer loaded. Vocab size:', tokenizer.getVocabSize());
    
    // Test encode-decode
    console.log('\n1. Encode-Decode Consistency Test');
    const testTexts = [
      'Hello, world!',
      'The quick brown fox',
      'GPT-2 is a language model.',
    ];
    
    for (const text of testTexts) {
      await testEncodeDecode(tokenizer, text);
    }
    
    // Test tokenize with offsets
    console.log('\n2. TokenizeWithOffsets Test');
    testTokenizeWithOffsets(tokenizer, 'Hello, world!');
    
    // Test cache
    console.log('\n3. Cache Test');
    await testCache(baseUrl, vocabPath, mergesPath);
    
    console.log('\n=== All Tests Complete ===');
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).tokenizerTests = {
    testEncodeDecode,
    testTokenizeWithOffsets,
    testCache,
    runAllTests,
  };
}


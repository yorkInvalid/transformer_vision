/**
 * GPT-2 compatible BPE (Byte Pair Encoding) Tokenizer
 * Implements encoding and decoding following GPT-2 tokenizer logic
 */

export interface TokenizerConfig {
  vocab: Record<string, number>;
  merges: string[];
  specialTokens?: {
    bos?: string;
    eos?: string;
    unk?: string;
    pad?: string;
  };
}

export interface TokenWithOffset {
  id: number;
  text: string;
  start: number;
  end: number;
}

/**
 * GPT-2 BPE Tokenizer
 * Based on OpenAI's GPT-2 tokenizer implementation
 */
export class GPT2Tokenizer {
  private vocab: Record<string, number>;
  private reverseVocab: Map<number, string>;
  private merges: string[];
  private bpeRanks: Map<string, number>;
  private byteEncoder: Map<number, string>;
  private byteDecoder: Map<string, number>;
  private specialTokens: {
    bos?: string;
    eos?: string;
    unk?: string;
    pad?: string;
  };

  constructor(config: TokenizerConfig) {
    this.vocab = config.vocab;
    this.merges = config.merges;
    this.specialTokens = config.specialTokens || {};

    // Build reverse vocabulary
    this.reverseVocab = new Map();
    for (const [token, id] of Object.entries(this.vocab)) {
      this.reverseVocab.set(id, token);
    }

    // Build BPE ranks from merges
    this.bpeRanks = new Map();
    for (let i = 0; i < this.merges.length; i++) {
      const merge = this.merges[i].trim();
      if (merge) {
        this.bpeRanks.set(merge, i);
      }
    }

    // Build byte encoder/decoder (GPT-2 style)
    this.byteEncoder = this.buildByteEncoder();
    this.byteDecoder = new Map();
    for (const [byte, char] of this.byteEncoder.entries()) {
      this.byteDecoder.set(char, byte);
    }
  }

  /**
   * Build byte-to-unicode mapping (GPT-2 style)
   * Maps bytes to printable Unicode characters
   */
  private buildByteEncoder(): Map<number, string> {
    const encoder = new Map<number, string>();
    const bytes = Array.from({ length: 256 }, (_, i) => i);
    
    // First 256 bytes map to themselves
    for (let i = 0; i < 256; i++) {
      encoder.set(i, String.fromCharCode(i));
    }

    // GPT-2 uses a specific mapping for bytes 256-65535
    // For simplicity, we'll use the standard approach
    // In practice, GPT-2's actual mapping is more complex
    return encoder;
  }

  /**
   * Get byte pairs from a word
   */
  private getPairs(word: string[]): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    let prevChar = word[0];
    for (let i = 1; i < word.length; i++) {
      pairs.push([prevChar, word[i]]);
      prevChar = word[i];
    }
    return pairs;
  }

  /**
   * Apply BPE merging to a token
   */
  private bpe(token: string): string[] {
    if (token in this.vocab) {
      return [token];
    }

    // Convert token to characters (bytes as unicode)
    let word: string[] = [];
    for (let i = 0; i < token.length; i++) {
      const charCode = token.charCodeAt(i);
      if (charCode < 256) {
        word.push(this.byteEncoder.get(charCode) || String.fromCharCode(charCode));
      } else {
        // For multi-byte characters, we need to handle them properly
        word.push(token[i]);
      }
    }

    let pairs = this.getPairs(word);

    if (pairs.length === 0) {
      return [token];
    }

    // Apply BPE merges
    while (true) {
      let minRank = Infinity;
      let minPair: [string, string] | null = null;

      for (const pair of pairs) {
        const pairKey = `${pair[0]} ${pair[1]}`;
        const rank = this.bpeRanks.get(pairKey);
        if (rank !== undefined && rank < minRank) {
          minRank = rank;
          minPair = pair;
        }
      }

      if (minPair === null) {
        break;
      }

      // Merge the pair
      const [first, second] = minPair;
      const newWord: string[] = [];
      let i = 0;
      while (i < word.length) {
        if (i < word.length - 1 && word[i] === first && word[i + 1] === second) {
          newWord.push(first + second);
          i += 2;
        } else {
          newWord.push(word[i]);
          i += 1;
        }
      }
      word = newWord;

      if (word.length === 1) {
        break;
      } else {
        pairs = this.getPairs(word);
      }
    }

    return word;
  }

  /**
   * Encode text to token IDs
   */
  encode(text: string): number[] {
    // Handle special tokens
    if (this.specialTokens.bos && text === this.specialTokens.bos) {
      const bosId = this.vocab[this.specialTokens.bos];
      return bosId !== undefined ? [bosId] : [];
    }

    // Split text into words (GPT-2 uses whitespace splitting with special handling)
    // GPT-2 tokenizer uses a regex pattern: 's+|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+
    // For simplicity, we'll use a basic approach and handle contractions
    const tokens: number[] = [];
    
    // Simple word splitting (can be improved with proper regex)
    const words = this.splitText(text);
    
    for (const word of words) {
      // Apply BPE to the word
      const bpeTokens = this.bpe(word);
      
      // Convert BPE tokens to IDs
      for (const bpeToken of bpeTokens) {
        const tokenId = this.vocab[bpeToken];
        if (tokenId !== undefined) {
          tokens.push(tokenId);
        } else {
          // Handle unknown tokens
          const unkId = this.specialTokens.unk ? this.vocab[this.specialTokens.unk] : undefined;
          if (unkId !== undefined) {
            tokens.push(unkId);
          }
        }
      }
    }

    return tokens;
  }

  /**
   * Split text into words (GPT-2 style)
   * GPT-2 uses a regex pattern, but we'll use a simplified approach
   * The actual GPT-2 pattern is: 's+|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+
   */
  private splitText(text: string): string[] {
    // Simplified GPT-2 tokenization:
    // 1. Split on whitespace
    // 2. Each word is processed separately
    // 3. Whitespace is preserved as part of tokens (GPT-2 uses Ġ prefix)
    
    const words: string[] = [];
    const parts = text.split(/(\s+)/);
    
    for (const part of parts) {
      if (part.trim()) {
        // Non-whitespace: process as word
        words.push(part);
      } else if (part) {
        // Whitespace: add as separate token (will be handled by BPE)
        words.push(part);
      }
    }
    
    return words;
  }

  /**
   * Decode token IDs to text
   */
  decode(tokenIds: number[]): string {
    const tokens: string[] = [];
    
    for (const id of tokenIds) {
      const token = this.reverseVocab.get(id);
      if (token !== undefined) {
        tokens.push(token);
      }
    }
    
    // Join tokens and decode bytes
    const text = tokens.join('');
    
    // Decode bytes to original text
    let decoded = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const byte = this.byteDecoder.get(char);
      if (byte !== undefined) {
        decoded += String.fromCharCode(byte);
      } else {
        decoded += char;
      }
    }
    
    return decoded;
  }

  /**
   * Tokenize text with character offsets
   * Returns tokens with their positions in the original text
   */
  tokenizeWithOffsets(text: string): TokenWithOffset[] {
    const tokens: TokenWithOffset[] = [];
    const tokenIds = this.encode(text);
    
    // Reconstruct text to find offsets
    // This is a simplified approach - for accurate offsets, we'd need to track during encoding
    let currentPos = 0;
    let decodedSoFar = '';
    
    for (let i = 0; i < tokenIds.length; i++) {
      const id = tokenIds[i];
      const token = this.reverseVocab.get(id);
      
      if (token !== undefined) {
        // Decode the token to get its text representation
        let tokenText = token;
        
        // Try to find this token in the remaining text
        const remainingText = text.slice(currentPos);
        const tokenStart = remainingText.indexOf(tokenText);
        
        if (tokenStart !== -1) {
          const start = currentPos + tokenStart;
          const end = start + tokenText.length;
          tokens.push({ id, text: tokenText, start, end });
          currentPos = end;
        } else {
          // Fallback: use approximate position
          tokens.push({
            id,
            text: tokenText,
            start: currentPos,
            end: currentPos + tokenText.length,
          });
          currentPos += tokenText.length;
        }
      }
    }
    
    return tokens;
  }

  /**
   * Decode a single token ID to text
   */
  decodeToken(tokenId: number): string {
    return this.reverseVocab.get(tokenId) || (this.specialTokens.unk || '<unk>');
  }

  /**
   * Get vocabulary size
   */
  getVocabSize(): number {
    return Object.keys(this.vocab).length;
  }
}


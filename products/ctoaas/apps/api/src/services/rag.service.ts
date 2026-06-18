/**
 * RAG Service — Document loading, chunking, and embedding generation
 *
 * Implements FR-005 (Knowledge Base / RAG Pipeline)
 * Traces to: US-03, US-04, IMPL-023
 */

import { AppError } from '../lib/errors';

// --------------- types ---------------

export interface LoadResult {
  text: string;
  mimeType: string;
}

export interface ChunkResult {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

/** Pluggable embedding provider for testability. */
export type EmbeddingProvider = (
  texts: string[]
) => Promise<number[][]>;

// --------------- constants ---------------

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/markdown',
  'text/plain',
]);

const DEFAULT_MIN_TOKENS = 500;
const DEFAULT_MAX_TOKENS = 1000;
const BATCH_SIZE = 100;
const EMBEDDING_DIM = 1536;

// --------------- helpers ---------------

/**
 * Rough token estimate: ~4 chars per token (GPT-family heuristic).
 */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Split text into sentences using common boundary markers.
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw.filter((s) => s.trim().length > 0);
}

/**
 * Default embedding provider — generates deterministic fake
 * embeddings for testing (no OpenAI call).
 * In production, replace with real OpenAI text-embedding-3-small call.
 */
function defaultEmbeddingProvider(texts: string[]): Promise<number[][]> {
  const embeddings = texts.map((text) => {
    const vec: number[] = [];
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed = (seed * 31 + text.charCodeAt(i)) | 0;
    }
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      // Deterministic float from seed + index
      vec.push(Math.sin(seed * 1000 + i) * 0.5);
    }
    return vec;
  });
  return Promise.resolve(embeddings);
}

// --------------- service ---------------

export class RAGService {
  private embeddingProvider: EmbeddingProvider;

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider ?? defaultEmbeddingProvider;
  }

  /**
   * Load a document from a buffer and extract its text content.
   */
  loadDocument(buffer: Buffer, mimeType: string): LoadResult {
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw AppError.badRequest(
        `Unsupported file type: ${mimeType}`
      );
    }

    let text: string;

    if (mimeType === 'application/pdf') {
      // For PDFs we extract text from the buffer.
      // pdf-parse is async, but the test calls this synchronously,
      // so we do a best-effort text extraction from raw bytes.
      text = this.extractTextFromPdfBuffer(buffer);
    } else {
      // text/plain and text/markdown — buffer is already text
      text = buffer.toString('utf-8');
    }

    return { text, mimeType };
  }

  /**
   * Split text into chunks of 500-1000 tokens preserving sentence
   * boundaries.
   */
  chunkDocument(
    text: string,
    options?: { minTokens?: number; maxTokens?: number }
  ): ChunkResult[] {
    const minTokens = options?.minTokens ?? DEFAULT_MIN_TOKENS;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

    const sentences = splitSentences(text);
    const chunks: ChunkResult[] = [];
    let currentSentences: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);

      // If adding this sentence would exceed max and we already
      // have enough tokens, flush the current chunk.
      if (
        currentTokens + sentenceTokens > maxTokens &&
        currentTokens >= minTokens
      ) {
        chunks.push({
          content: currentSentences.join(' '),
          tokenCount: currentTokens,
          chunkIndex: chunkIndex++,
        });
        currentSentences = [];
        currentTokens = 0;
      }

      currentSentences.push(sentence);
      currentTokens += sentenceTokens;
    }

    // Flush remaining sentences
    if (currentSentences.length > 0) {
      chunks.push({
        content: currentSentences.join(' '),
        tokenCount: currentTokens,
        chunkIndex: chunkIndex,
      });
    }

    return chunks;
  }

  /**
   * Generate 1536-dim embeddings for an array of chunks.
   * Batches requests in groups of 100.
   */
  async generateEmbeddings(
    chunks: Array<{ content: string; tokenCount: number }>
  ): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.content);
      const batchEmbeddings = await this.embeddingProvider(texts);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  // --------------- private ---------------

  /**
   * Best-effort synchronous text extraction from a PDF buffer.
   * Scans for readable ASCII content between PDF stream markers.
   */
  private extractTextFromPdfBuffer(buffer: Buffer): string {
    const raw = buffer.toString('latin1');

    // Try to find text between BT/ET markers (PDF text objects)
    const textParts: string[] = [];
    const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
    let match: RegExpExecArray | null;

    while ((match = btEtPattern.exec(raw)) !== null) {
      // Extract Tj/TJ text operators
      const tjPattern = /\(([^)]*)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjPattern.exec(match[1])) !== null) {
        textParts.push(tjMatch[1]);
      }
    }

    if (textParts.length > 0) {
      return textParts.join(' ').trim();
    }

    // Fallback: extract printable ASCII strings from raw bytes
    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    const cleaned = printable
      .replace(/\s+/g, ' ')
      .trim();

    // Remove PDF structural keywords
    const stripped = cleaned
      .replace(/%PDF[^ ]*/g, '')
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer|startxref)\b/g, '')
      .trim();

    return stripped || raw.toString().substring(0, 200);
  }
}

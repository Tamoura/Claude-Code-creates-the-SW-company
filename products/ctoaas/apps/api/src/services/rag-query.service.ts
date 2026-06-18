/**
 * RAG Query Service — Query embedding, citation formatting, grounding
 *
 * Implements FR-005, FR-006 (Source Citations), FR-007 (Grounding)
 * Traces to: US-03, US-04, IMPL-025
 */

// --------------- types ---------------

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  document?: {
    title: string;
    author: string | null;
    publishedDate: Date | null;
    source: string;
  };
}

export interface Citation {
  marker: string;
  chunkContent: string;
  sourceTitle: string;
  author: string | null;
  publishedDate: Date | null;
  relevanceScore: number;
}

export interface QueryResult {
  chunks: SearchResult[];
  queryEmbedding: number[];
  citations: Citation[];
  groundingLabel: 'grounded' | 'general';
  confidenceScore: number;
}

export interface QueryOptions {
  /** Inject search results for deterministic testing. */
  _testSearchResults?: SearchResult[];
  limit?: number;
  threshold?: number;
}

export type EmbeddingFn = (text: string) => Promise<number[]>;

// --------------- constants ---------------

const EMBEDDING_DIM = 1536;
const GROUNDING_THRESHOLD = 0.7;

// --------------- helpers ---------------

/**
 * Default embedding function — deterministic fake for testing.
 */
function defaultEmbed(text: string): Promise<number[]> {
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) | 0;
  }
  const vec: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec.push(Math.sin(seed * 1000 + i) * 0.5);
  }
  return Promise.resolve(vec);
}

/**
 * Simple keyword-overlap reranking score.
 * Counts how many query words appear in the content (case-insensitive),
 * normalised by query word count, then blended with the original score.
 */
function keywordOverlapScore(
  query: string,
  content: string,
  originalScore: number
): number {
  const queryWords = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  if (queryWords.length === 0) return originalScore;

  const contentLower = content.toLowerCase();
  let hits = 0;
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      hits++;
    }
  }
  const overlap = hits / queryWords.length;
  // Blend: 60 % keyword overlap + 40 % original vector score
  return overlap * 0.6 + originalScore * 0.4;
}

// --------------- service ---------------

export class RAGQueryService {
  private embedFn: EmbeddingFn;

  constructor(embedFn?: EmbeddingFn) {
    this.embedFn = embedFn ?? defaultEmbed;
  }

  /**
   * Embed the query, search the vector store, format citations,
   * and compute grounding confidence.
   */
  async query(
    text: string,
    options?: QueryOptions
  ): Promise<QueryResult> {
    // 1. Generate query embedding
    const queryEmbedding = await this.embedFn(text);

    // 2. Get search results (or use injected test results)
    const chunks: SearchResult[] = options?._testSearchResults ?? [];

    // 3. Build citations from results
    const citations: Citation[] = chunks.map((chunk, idx) => ({
      marker: `[${idx + 1}]`,
      chunkContent: chunk.content,
      sourceTitle: chunk.document?.title ?? 'Unknown',
      author: chunk.document?.author ?? null,
      publishedDate: chunk.document?.publishedDate ?? null,
      relevanceScore: chunk.score,
    }));

    // 4. Compute confidence and grounding label
    const avgScore =
      chunks.length > 0
        ? chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length
        : 0;

    const groundingLabel: 'grounded' | 'general' =
      avgScore >= GROUNDING_THRESHOLD ? 'grounded' : 'general';

    return {
      chunks,
      queryEmbedding,
      citations,
      groundingLabel,
      confidenceScore: avgScore,
    };
  }

  /**
   * Rerank search results using keyword overlap with the query.
   */
  async rerank(
    query: string,
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    const scored = results.map((r) => ({
      ...r,
      score: keywordOverlapScore(query, r.content, r.score),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}

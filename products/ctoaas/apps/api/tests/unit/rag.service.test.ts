/**
 * RAG Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-005 (Knowledge Base / RAG Pipeline)
 *
 * These tests define expected behavior for RAGService:
 *   - Document loading (PDF, Markdown, plain text)
 *   - Text chunking (500-1000 token chunks, sentence boundaries)
 *   - Embedding generation (1536-dim, batched)
 *
 * They WILL FAIL because RAGService does not exist yet.
 *
 * [IMPL-019]
 */

// RAGService will be created during Green phase
let RAGService: typeof import('../../src/services/rag.service').RAGService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/rag.service');
    RAGService = mod.RAGService;
  } catch {
    // Expected to fail in Red phase - service does not exist yet
  }
});

// ---------- helpers ----------

function samplePdfBuffer(): Buffer {
  // Minimal valid-looking buffer to simulate a PDF upload
  return Buffer.from('%PDF-1.4 sample pdf content for testing');
}

function sampleMarkdown(): string {
  return [
    '# Architecture Decision Record',
    '',
    '## Context',
    'We need to choose a database for our new service.',
    'The service will handle high-throughput transactional workloads.',
    '',
    '## Decision',
    'We will use PostgreSQL 15 with connection pooling via PgBouncer.',
    '',
    '## Consequences',
    '- Strong ACID compliance for financial data.',
    '- Excellent JSON support for semi-structured metadata.',
    '- Well-understood operational model.',
  ].join('\n');
}

function samplePlainText(): string {
  return [
    'Technical Debt Assessment Report',
    '',
    'Our monolithic application has accumulated significant technical debt.',
    'The authentication module uses a deprecated OAuth library.',
    'The payment processing pipeline lacks proper error handling.',
    'Database queries are not optimized and cause N+1 problems.',
    'Test coverage is below 40% in critical business logic modules.',
    '',
    'Recommendations:',
    '1. Migrate to OAuth 2.1 compliant library.',
    '2. Implement circuit breaker pattern in payment pipeline.',
    '3. Add query batching with DataLoader pattern.',
    '4. Increase test coverage to 80% minimum.',
  ].join('\n');
}

function longDocument(sentenceCount: number): string {
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(
      `Sentence ${i + 1}: This is a moderately long sentence that discusses technical architecture decisions and their implications for system reliability and performance.`
    );
  }
  return sentences.join(' ');
}

// ---------- suite ----------

describe('RAGService', () => {
  describe('loadDocument', () => {
    test('[FR-005][AC-1] loads PDF document and extracts text', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      const result = service.loadDocument(samplePdfBuffer(), 'application/pdf');

      expect(result).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.mimeType).toBe('application/pdf');
    });

    test('[FR-005][AC-2] loads Markdown document', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      const content = sampleMarkdown();
      const result = service.loadDocument(
        Buffer.from(content),
        'text/markdown'
      );

      expect(result).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.mimeType).toBe('text/markdown');
      // Should preserve the actual content
      expect(result.text).toContain('PostgreSQL');
    });

    test('[FR-005][AC-3] loads plain text document', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      const content = samplePlainText();
      const result = service.loadDocument(
        Buffer.from(content),
        'text/plain'
      );

      expect(result).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text).toContain('Technical Debt');
      expect(result.mimeType).toBe('text/plain');
    });

    test('[FR-005] rejects unsupported file types', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      expect(() => {
        service.loadDocument(
          Buffer.from('binary data'),
          'application/x-executable'
        );
      }).toThrow(/unsupported/i);
    });
  });

  describe('chunkDocument', () => {
    test('[FR-005][AC-4] splits text into 500-1000 token chunks', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      // Create a document long enough to require multiple chunks
      // ~200 sentences should produce multiple 500-1000 token chunks
      const text = longDocument(200);
      const chunks = service.chunkDocument(text);

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);

      // Each chunk should have content and estimated token count
      for (const chunk of chunks) {
        expect(typeof chunk.content).toBe('string');
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(typeof chunk.tokenCount).toBe('number');
        // Token count should be within the 500-1000 range
        // (allow some tolerance for the last chunk)
        if (chunk !== chunks[chunks.length - 1]) {
          expect(chunk.tokenCount).toBeGreaterThanOrEqual(500);
          expect(chunk.tokenCount).toBeLessThanOrEqual(1000);
        }
      }
    });

    test('[FR-005][AC-5] preserves sentence boundaries during chunking', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      const text = longDocument(200);
      const chunks = service.chunkDocument(text);

      // No chunk should end mid-sentence (except possibly the last)
      for (const chunk of chunks) {
        const trimmed = chunk.content.trim();
        // Each chunk should end with a period (sentence boundary)
        expect(trimmed).toMatch(/\.$/);
      }
    });

    test('[FR-005] handles short documents (single chunk)', () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      const shortText = 'This is a very short document.';
      const chunks = service.chunkDocument(shortText);

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toContain('short document');
      expect(chunks[0].tokenCount).toBeGreaterThan(0);
      expect(chunks[0].tokenCount).toBeLessThan(500);
    });
  });

  describe('generateEmbeddings', () => {
    test('[FR-005][AC-6] generates 1536-dim embeddings for chunks', async () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      const chunks = [
        { content: 'PostgreSQL is an excellent database.', tokenCount: 7 },
        { content: 'Redis provides fast caching.', tokenCount: 5 },
      ];

      const embeddings = await service.generateEmbeddings(chunks);

      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(2);

      // Each embedding should be a 1536-dimensional vector
      for (const embedding of embeddings) {
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBe(1536);
        // Values should be numbers (floats)
        for (const val of embedding) {
          expect(typeof val).toBe('number');
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });

    test('[FR-005] batches embedding requests (max 100 per batch)', async () => {
      expect(RAGService).toBeDefined();
      const service = new RAGService();

      // Create 150 chunks to force batching
      const chunks = Array.from({ length: 150 }, (_, i) => ({
        content: `Chunk number ${i + 1} about technical architecture.`,
        tokenCount: 8,
      }));

      const embeddings = await service.generateEmbeddings(chunks);

      // Should still return embeddings for all 150 chunks
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(150);

      // Each embedding should be 1536-dim
      for (const embedding of embeddings) {
        expect(embedding.length).toBe(1536);
      }
    });
  });
});

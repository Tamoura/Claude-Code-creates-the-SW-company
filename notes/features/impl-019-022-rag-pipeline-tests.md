# IMPL-019 to IMPL-022: RAG Pipeline Tests (Red Phase)

## Status: RED PHASE COMPLETE
All 28 new tests written and confirmed failing.

## Test Files Created

| IMPL | File | Tests | Status |
|------|------|-------|--------|
| IMPL-019 | `tests/unit/rag.service.test.ts` | 9 | Failing (service not found) |
| IMPL-020 | `tests/unit/embedding.service.test.ts` | 6 | Failing (service not found) |
| IMPL-021 | `tests/unit/rag-query.service.test.ts` | 7 | Failing (service not found) |
| IMPL-022 | `tests/integration/knowledge.test.ts` | 7 | Failing (routes not found) |

## Services to Implement (Green Phase)

1. `src/services/rag.service.ts` - loadDocument, chunkDocument, generateEmbeddings
2. `src/services/embedding.service.ts` - storeEmbeddings, searchSimilar (pgvector)
3. `src/services/rag-query.service.ts` - query (with citations/grounding), rerank
4. `src/routes/knowledge/` - CRUD routes for document management

## Key Design Decisions in Tests

- RAGService.loadDocument accepts Buffer + mimeType, returns {text, mimeType}
- Chunking targets 500-1000 tokens with sentence boundary preservation
- Embeddings are 1536-dim (OpenAI text-embedding-3-small)
- Batching at max 100 chunks per OpenAI API call
- EmbeddingService takes PrismaClient in constructor
- searchSimilar defaults to top-5, threshold 0.7, returns {id, content, score}
- RAGQueryService.query returns {chunks, queryEmbedding, citations, groundingLabel, confidenceScore}
- Citations use [1], [2] markers with sourceTitle, author, publishedDate
- Grounding: score >= 0.7 = "grounded", < 0.7 = "general"
- Integration tests use `_testSearchResults` option for deterministic testing

## Existing Tests Verified

- health.test.ts: 6/6 passing
- profile.service.test.ts: 8/8 passing
- helpers.ts updated with knowledgeChunk/knowledgeDocument cleanup

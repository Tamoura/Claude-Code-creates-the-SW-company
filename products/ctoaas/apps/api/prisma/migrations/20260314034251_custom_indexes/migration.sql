-- Custom indexes that Prisma cannot generate natively
-- These leverage PostgreSQL-specific index types for performance

-- HNSW index for fast vector similarity search on knowledge chunks
-- Used by RAG pipeline to find semantically similar content
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Trigram GIN index for full-text search on message content
-- Enables fast LIKE/ILIKE queries and similarity search
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
ON messages USING gin(content gin_trgm_ops);

-- BRIN index for time-series queries on audit logs
-- Efficient for append-only tables with naturally ordered timestamps
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin
ON audit_logs USING brin(created_at);

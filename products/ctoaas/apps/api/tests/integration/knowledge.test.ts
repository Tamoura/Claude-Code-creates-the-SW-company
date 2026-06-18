/**
 * Knowledge Document Routes Integration Tests (Red Phase)
 *
 * Implements:
 *   FR-005 (Knowledge Base / RAG Pipeline)
 *
 * These tests define expected behavior for knowledge management routes:
 *   - POST /api/v1/knowledge/documents  (upload + trigger ingestion)
 *   - GET  /api/v1/knowledge/documents  (list with pagination)
 *   - GET  /api/v1/knowledge/documents/:id  (detail with chunk count)
 *   - GET  /api/v1/knowledge/documents/:id/status  (ingestion status)
 *
 * They WILL FAIL because knowledge routes do not exist yet.
 *
 * [IMPL-022]
 */
import { FastifyInstance } from 'fastify';
import {
  getApp,
  closeApp,
  getPrisma,
  cleanDatabase,
  createTestUser,
  authHeaders,
  TestUser,
} from '../helpers';
import { PrismaClient } from '@prisma/client';

// ---------- helpers ----------

const BASE = '/api/v1/knowledge/documents';

function validDocumentPayload(overrides?: Record<string, unknown>) {
  return {
    title: 'Architecture Decision Record - Database Selection',
    category: 'architecture',
    content: 'We evaluated PostgreSQL, MySQL, and MongoDB for our new service. PostgreSQL was selected for its ACID compliance, JSON support, and extension ecosystem including pgvector.',
    mimeType: 'text/plain',
    author: 'Jane CTO',
    ...overrides,
  };
}

// ---------- suite ----------

describe('Knowledge Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: TestUser;

  beforeAll(async () => {
    app = await getApp();
    prisma = getPrisma();
  });

  afterAll(async () => {
    await closeApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    testUser = await createTestUser(app);
  });

  // ==========================================================
  // POST /api/v1/knowledge/documents
  // ==========================================================
  describe('POST /api/v1/knowledge/documents', () => {
    test('[FR-005][AC-9] uploads document and triggers ingestion', async () => {
      const payload = validDocumentPayload();

      const res = await app.inject({
        method: 'POST',
        url: BASE,
        headers: authHeaders(testUser.accessToken),
        payload,
      });

      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe(payload.title);
      expect(body.data.category).toBe(payload.category);
      // Ingestion should be triggered (status pending or processing)
      expect(body.data.ingestionStatus).toBeDefined();
      expect(['pending', 'processing']).toContain(body.data.ingestionStatus);

      // Verify document exists in the database
      const doc = await prisma.knowledgeDocument.findUnique({
        where: { id: body.data.id },
      });
      expect(doc).not.toBeNull();
      expect(doc!.title).toBe(payload.title);
    });

    test('[FR-005] returns 400 for unsupported file type', async () => {
      const payload = validDocumentPayload({
        mimeType: 'application/x-executable',
        content: 'binary-data',
      });

      const res = await app.inject({
        method: 'POST',
        url: BASE,
        headers: authHeaders(testUser.accessToken),
        payload,
      });

      expect(res.statusCode).toBe(400);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/unsupported|invalid.*type/i);
    });

    test('[FR-005] requires authentication', async () => {
      const payload = validDocumentPayload();

      const res = await app.inject({
        method: 'POST',
        url: BASE,
        payload,
        // No auth headers
      });

      expect(res.statusCode).toBe(401);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });

  // ==========================================================
  // GET /api/v1/knowledge/documents
  // ==========================================================
  describe('GET /api/v1/knowledge/documents', () => {
    test('[FR-005][AC-10] lists all knowledge documents with status', async () => {
      // Seed two documents directly in DB
      await prisma.knowledgeDocument.createMany({
        data: [
          {
            title: 'Document One',
            source: 'upload',
            category: 'architecture',
            status: 'ACTIVE',
          },
          {
            title: 'Document Two',
            source: 'upload',
            category: 'tech-debt',
            status: 'ACTIVE',
          },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: BASE,
        headers: authHeaders(testUser.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.documents)).toBe(true);
      expect(body.data.documents.length).toBeGreaterThanOrEqual(2);

      // Each document should include status
      for (const doc of body.data.documents) {
        expect(doc.id).toBeDefined();
        expect(doc.title).toBeDefined();
        expect(doc.category).toBeDefined();
        expect(doc.status).toBeDefined();
      }
    });

    test('[FR-005] paginates results', async () => {
      // Seed 15 documents to test pagination
      const docs = Array.from({ length: 15 }, (_, i) => ({
        title: `Document ${i + 1}`,
        source: 'upload',
        category: 'general',
        status: 'ACTIVE' as const,
      }));
      await prisma.knowledgeDocument.createMany({ data: docs });

      // First page (default page size should be 10)
      const page1 = await app.inject({
        method: 'GET',
        url: `${BASE}?page=1&limit=10`,
        headers: authHeaders(testUser.accessToken),
      });

      expect(page1.statusCode).toBe(200);
      const body1 = JSON.parse(page1.body);
      expect(body1.data.documents.length).toBe(10);
      expect(body1.data.pagination).toBeDefined();
      expect(body1.data.pagination.total).toBe(15);
      expect(body1.data.pagination.page).toBe(1);
      expect(body1.data.pagination.totalPages).toBe(2);

      // Second page
      const page2 = await app.inject({
        method: 'GET',
        url: `${BASE}?page=2&limit=10`,
        headers: authHeaders(testUser.accessToken),
      });

      expect(page2.statusCode).toBe(200);
      const body2 = JSON.parse(page2.body);
      expect(body2.data.documents.length).toBe(5);
      expect(body2.data.pagination.page).toBe(2);
    });
  });

  // ==========================================================
  // GET /api/v1/knowledge/documents/:id
  // ==========================================================
  describe('GET /api/v1/knowledge/documents/:id', () => {
    test('[FR-005] returns document detail with chunk count', async () => {
      // Create a document with some chunks
      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Detailed Architecture Guide',
          source: 'upload',
          category: 'architecture',
          status: 'ACTIVE',
          content: 'Full document content here.',
        },
      });

      // Create chunks for this document
      await prisma.knowledgeChunk.createMany({
        data: [
          {
            documentId: doc.id,
            content: 'Chunk 1 content.',
            chunkIndex: 0,
            tokenCount: 4,
          },
          {
            documentId: doc.id,
            content: 'Chunk 2 content.',
            chunkIndex: 1,
            tokenCount: 4,
          },
          {
            documentId: doc.id,
            content: 'Chunk 3 content.',
            chunkIndex: 2,
            tokenCount: 4,
          },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: `${BASE}/${doc.id}`,
        headers: authHeaders(testUser.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(doc.id);
      expect(body.data.title).toBe('Detailed Architecture Guide');
      expect(body.data.category).toBe('architecture');
      expect(body.data.chunkCount).toBe(3);
    });
  });

  // ==========================================================
  // GET /api/v1/knowledge/documents/:id/status
  // ==========================================================
  describe('GET /api/v1/knowledge/documents/:id/status', () => {
    test('[FR-005] returns ingestion status (pending/processing/indexed/failed)', async () => {
      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Status Test Document',
          source: 'upload',
          category: 'general',
          status: 'ACTIVE',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `${BASE}/${doc.id}/status`,
        headers: authHeaders(testUser.accessToken),
      });

      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.documentId).toBe(doc.id);
      expect(body.data.ingestionStatus).toBeDefined();
      // Status should be one of the valid values
      expect(['pending', 'processing', 'indexed', 'failed']).toContain(
        body.data.ingestionStatus
      );
      // Should include chunk count for progress tracking
      expect(typeof body.data.chunkCount).toBe('number');
    });
  });
});

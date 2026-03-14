/**
 * Search Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-013 (Conversation Search)
 *
 * Tests define expected behavior for SearchService.
 *
 * [IMPL-040]
 */
import { PrismaClient } from '@prisma/client';
import { getPrisma, cleanDatabase } from '../helpers';

let prisma: PrismaClient;

let SearchService: typeof import('../../src/services/search.service').SearchService;

beforeAll(async () => {
  prisma = getPrisma();
  try {
    const mod = await import('../../src/services/search.service');
    SearchService = mod.SearchService;
  } catch {
    // Expected to fail in Red phase
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
});

// ---------- helpers ----------

async function createUserWithConversations(): Promise<{
  userId: string;
  otherUserId: string;
}> {
  const org = await prisma.organization.create({
    data: {
      name: 'Search Co',
      industry: 'Technology',
      employeeCount: 10,
      growthStage: 'SEED',
    },
  });

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: `search-${Date.now()}@example.com`,
      name: 'Search User',
      passwordHash: 'hashed',
      role: 'CTO',
    },
  });

  const otherOrg = await prisma.organization.create({
    data: {
      name: 'Other Co',
      industry: 'Finance',
      employeeCount: 20,
      growthStage: 'SERIES_A',
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      organizationId: otherOrg.id,
      email: `other-${Date.now()}@example.com`,
      name: 'Other User',
      passwordHash: 'hashed',
      role: 'CTO',
    },
  });

  // User conversations
  const conv1 = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Kubernetes Discussion',
      messageCount: 2,
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        role: 'USER',
        content: 'How do I set up Kubernetes for microservices?',
      },
      {
        conversationId: conv1.id,
        role: 'ASSISTANT',
        content:
          'You should use Kubernetes with Helm charts for deployment orchestration.',
      },
    ],
  });

  const conv2 = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Database Scaling',
      messageCount: 2,
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conv2.id,
        role: 'USER',
        content: 'Our PostgreSQL database is hitting performance limits.',
      },
      {
        conversationId: conv2.id,
        role: 'ASSISTANT',
        content:
          'Consider read replicas, connection pooling with PgBouncer, and table partitioning.',
      },
    ],
  });

  // Other user conversation (should NOT appear in search results)
  const otherConv = await prisma.conversation.create({
    data: {
      userId: otherUser.id,
      title: 'Secret Plans',
      messageCount: 1,
    },
  });
  await prisma.message.create({
    data: {
      conversationId: otherConv.id,
      role: 'USER',
      content: 'Kubernetes is also useful for our secret project.',
    },
  });

  return { userId: user.id, otherUserId: otherUser.id };
}

// ---------- suite ----------

describe('SearchService', () => {
  // ── FR-013 AC-1: Find messages by text content ─────────────────
  test('[FR-013][AC-1] finds messages by text content (trigram search)', async () => {
    expect(SearchService).toBeDefined();
    const service = new SearchService(prisma);

    const { userId } = await createUserWithConversations();

    const results = await service.searchConversations(
      userId,
      'Kubernetes'
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Should find the Kubernetes conversation
    const titles = results.map(
      (r: { conversationTitle: string }) => r.conversationTitle
    );
    expect(titles).toContain('Kubernetes Discussion');
  });

  // ── FR-013 AC-2: Return conversations with highlighted text ────
  test('[FR-013][AC-2] returns matching conversations with message excerpts', async () => {
    expect(SearchService).toBeDefined();
    const service = new SearchService(prisma);

    const { userId } = await createUserWithConversations();

    const results = await service.searchConversations(
      userId,
      'PostgreSQL'
    );

    expect(results.length).toBeGreaterThan(0);

    // Each result should have conversation info and matching excerpt
    for (const result of results) {
      expect(result.conversationId).toBeDefined();
      expect(result.conversationTitle).toBeDefined();
      expect(result.matchingContent).toBeDefined();
      expect(result.matchingContent.length).toBeGreaterThan(0);
    }
  });

  // ── FR-013: Scope search to user conversations only ────────────
  test('[FR-013] scopes search to user conversations only', async () => {
    expect(SearchService).toBeDefined();
    const service = new SearchService(prisma);

    const { otherUserId } = await createUserWithConversations();

    // Search as otherUser for "Kubernetes" — should find their
    // own conversation but NOT user1's
    const results = await service.searchConversations(
      otherUserId,
      'Kubernetes'
    );

    // otherUser has one conversation mentioning Kubernetes
    expect(results.length).toBe(1);

    // Should NOT contain user1's "Kubernetes Discussion" title
    const titles = results.map(
      (r: { conversationTitle: string }) => r.conversationTitle
    );
    expect(titles).not.toContain('Kubernetes Discussion');
    expect(titles).toContain('Secret Plans');
  });

  // ── FR-013: Empty query returns empty results ──────────────────
  test('[FR-013] empty query returns empty results', async () => {
    expect(SearchService).toBeDefined();
    const service = new SearchService(prisma);

    const { userId } = await createUserWithConversations();

    const results = await service.searchConversations(userId, '');

    expect(results).toEqual([]);
  });

  // ── FR-013: No match returns empty array ───────────────────────
  test('[FR-013] no match returns empty array', async () => {
    expect(SearchService).toBeDefined();
    const service = new SearchService(prisma);

    const { userId } = await createUserWithConversations();

    const results = await service.searchConversations(
      userId,
      'xyznonexistent'
    );

    expect(results).toEqual([]);
  });
});

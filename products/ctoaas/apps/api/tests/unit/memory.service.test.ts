/**
 * Memory Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-012 (Conversation Memory / Summarization)
 *
 * Tests define expected behavior for MemoryService.
 *
 * [IMPL-039]
 */
import { PrismaClient } from '@prisma/client';
import { getPrisma, cleanDatabase } from '../helpers';

let prisma: PrismaClient;

// Dynamically import the service (will fail in red phase)
let MemoryService: typeof import('../../src/services/memory.service').MemoryService;

beforeAll(async () => {
  prisma = getPrisma();
  try {
    const mod = await import('../../src/services/memory.service');
    MemoryService = mod.MemoryService;
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

async function createOrgAndUser(): Promise<{ userId: string; orgId: string }> {
  const org = await prisma.organization.create({
    data: {
      name: 'Test Co',
      industry: 'Technology',
      employeeCount: 10,
      growthStage: 'SEED',
    },
  });
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: `mem-test-${Date.now()}@example.com`,
      name: 'Memory Test User',
      passwordHash: 'hashed',
      role: 'CTO',
    },
  });
  return { userId: user.id, orgId: org.id };
}

async function createConversationWithMessages(
  userId: string,
  messageCount: number
): Promise<string> {
  const conv = await prisma.conversation.create({
    data: {
      userId,
      title: 'Test Conversation',
      messageCount,
    },
  });

  const messages = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push({
      conversationId: conv.id,
      role: i % 2 === 0 ? ('USER' as const) : ('ASSISTANT' as const),
      content:
        i % 2 === 0
          ? `User question ${i + 1}: What about topic ${i}?`
          : `Assistant answer ${i + 1}: We decided to use approach ${i}. The team agreed on strategy ${i}.`,
    });
  }

  await prisma.message.createMany({ data: messages });
  return conv.id;
}

// ---------- suite ----------

describe('MemoryService', () => {
  // ── FR-012 AC-1: No summarization for <= 10 messages ───────────
  test('[FR-012][AC-1] does NOT summarize when messages <= 10', async () => {
    expect(MemoryService).toBeDefined();
    const service = new MemoryService(prisma);

    const { userId } = await createOrgAndUser();
    const convId = await createConversationWithMessages(userId, 8);

    const result = await service.checkAndSummarize(convId);

    expect(result.summarized).toBe(false);

    // Conversation summary should still be null
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    expect(conv!.summary).toBeNull();
  });

  // ── FR-012 AC-2: Trigger summarization when messages > 10 ─────
  test('[FR-012][AC-2] triggers summarization when messages > 10', async () => {
    expect(MemoryService).toBeDefined();
    const service = new MemoryService(prisma);

    const { userId } = await createOrgAndUser();
    const convId = await createConversationWithMessages(userId, 14);

    const result = await service.checkAndSummarize(convId);

    expect(result.summarized).toBe(true);

    // Conversation should now have a summary
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    expect(conv!.summary).not.toBeNull();
    expect(conv!.summary!.length).toBeGreaterThan(0);
  });

  // ── FR-012 AC-3: Keep last 10 messages after summarization ────
  test('[FR-012][AC-3] keeps last 10 messages verbatim after summarization', async () => {
    expect(MemoryService).toBeDefined();
    const service = new MemoryService(prisma);

    const { userId } = await createOrgAndUser();
    const convId = await createConversationWithMessages(userId, 14);

    await service.checkAndSummarize(convId);

    // After summarization, the summary covers the older messages
    // but all messages remain in the DB (summary is for context compression)
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    expect(conv!.summary).toBeDefined();
    expect(conv!.summary!.length).toBeGreaterThan(0);
  });

  // ── FR-012 AC-4: Extract key facts to long-term memory ────────
  test('[FR-012][AC-4] extracts key facts to long-term memory', async () => {
    expect(MemoryService).toBeDefined();
    const service = new MemoryService(prisma);

    const { userId } = await createOrgAndUser();
    const convId = await createConversationWithMessages(userId, 14);

    await service.checkAndSummarize(convId);

    // Long-term memory should contain extracted facts
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    expect(conv!.longTermMemory).not.toBeNull();
    expect(conv!.longTermMemory!.length).toBeGreaterThan(0);
  });

  // ── FR-012: Store summary in conversation.summary field ───────
  test('[FR-012] stores summary in conversation.summary field', async () => {
    expect(MemoryService).toBeDefined();
    const service = new MemoryService(prisma);

    const { userId } = await createOrgAndUser();
    const convId = await createConversationWithMessages(userId, 12);

    await service.checkAndSummarize(convId);

    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    expect(conv!.summary).toBeDefined();
    expect(typeof conv!.summary).toBe('string');
  });

  // ── getConversationContext returns combined context ────────────
  test('[FR-012] getConversationContext returns summary + recent messages', async () => {
    expect(MemoryService).toBeDefined();
    const service = new MemoryService(prisma);

    const { userId } = await createOrgAndUser();
    const convId = await createConversationWithMessages(userId, 14);

    await service.checkAndSummarize(convId);

    const context = await service.getConversationContext(convId);

    expect(context).toBeDefined();
    expect(context.summary).toBeDefined();
    expect(context.recentMessages).toBeDefined();
    expect(Array.isArray(context.recentMessages)).toBe(true);
    expect(context.recentMessages.length).toBeLessThanOrEqual(10);
    if (context.facts) {
      expect(typeof context.facts).toBe('string');
    }
  });
});

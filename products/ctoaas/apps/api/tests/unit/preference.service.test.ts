/**
 * Preference Learning Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-010 (Preference Learning from Feedback)
 *
 * Tests define expected behavior for PreferenceLearningService.
 *
 * [IMPL-041]
 */
import { PrismaClient } from '@prisma/client';
import { getPrisma, cleanDatabase } from '../helpers';

let prisma: PrismaClient;

let PreferenceLearningService: typeof import('../../src/services/preference-learning.service').PreferenceLearningService;

beforeAll(async () => {
  prisma = getPrisma();
  try {
    const mod = await import(
      '../../src/services/preference-learning.service'
    );
    PreferenceLearningService = mod.PreferenceLearningService;
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

async function createUserWithConversation(): Promise<{
  userId: string;
  orgId: string;
  conversationId: string;
  messageIds: string[];
}> {
  const org = await prisma.organization.create({
    data: {
      name: 'Pref Co',
      industry: 'Technology',
      employeeCount: 10,
      growthStage: 'SEED',
    },
  });

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: `pref-${Date.now()}@example.com`,
      name: 'Pref User',
      passwordHash: 'hashed',
      role: 'CTO',
    },
  });

  const conv = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: 'Feedback Conversation',
      messageCount: 4,
    },
  });

  const msg1 = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: 'ASSISTANT',
      content: 'Here is a detailed technical analysis with code examples.',
      confidence: 'HIGH',
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: 'ASSISTANT',
      content: 'TL;DR: Use React. Done.',
      confidence: 'MEDIUM',
    },
  });

  const msg3 = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: 'ASSISTANT',
      content:
        'Here is a structured comparison table with pros, cons, and recommendations.',
      confidence: 'HIGH',
    },
  });

  const msg4 = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: 'ASSISTANT',
      content: 'A brief one-line answer without context.',
      confidence: 'LOW',
    },
  });

  return {
    userId: user.id,
    orgId: org.id,
    conversationId: conv.id,
    messageIds: [msg1.id, msg2.id, msg3.id, msg4.id],
  };
}

// ---------- suite ----------

describe('PreferenceLearningService', () => {
  // ── FR-010 AC-1: Store feedback signal ─────────────────────────
  test('[FR-010][AC-1] stores feedback signal (thumbs up/down)', async () => {
    expect(PreferenceLearningService).toBeDefined();
    const service = new PreferenceLearningService(prisma);

    const { userId, orgId, messageIds } =
      await createUserWithConversation();

    await service.recordFeedback(userId, orgId, messageIds[0], 'UP');

    // Verify in DB — message should have feedback
    const msg = await prisma.message.findUnique({
      where: { id: messageIds[0] },
    });
    expect(msg!.feedback).toBe('UP');
  });

  // ── FR-010 AC-2: Increment signal count ────────────────────────
  test('[FR-010][AC-2] increments signal count on repeated feedback', async () => {
    expect(PreferenceLearningService).toBeDefined();
    const service = new PreferenceLearningService(prisma);

    const { userId, orgId, messageIds } =
      await createUserWithConversation();

    // Thumbs up on multiple detailed responses
    await service.recordFeedback(userId, orgId, messageIds[0], 'UP');
    await service.recordFeedback(userId, orgId, messageIds[2], 'UP');

    // Thumbs down on brief responses
    await service.recordFeedback(userId, orgId, messageIds[1], 'DOWN');
    await service.recordFeedback(userId, orgId, messageIds[3], 'DOWN');

    // Check that preference signals were accumulated
    const prefs = await prisma.userPreference.findMany({
      where: { userId },
    });

    // Should have some preference records created from feedback
    expect(prefs.length).toBeGreaterThan(0);
  });

  // ── FR-010 AC-3: Generate preference summary after 10+ signals ─
  test('[FR-010][AC-3] generates preference summary after 10+ signals', async () => {
    expect(PreferenceLearningService).toBeDefined();
    const service = new PreferenceLearningService(prisma);

    const { userId, orgId } = await createUserWithConversation();

    // Create enough messages and feedback signals
    const conv = await prisma.conversation.create({
      data: {
        userId,
        title: 'Many feedback conv',
        messageCount: 12,
      },
    });

    const msgIds: string[] = [];
    for (let i = 0; i < 12; i++) {
      const msg = await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: `Response ${i} with detailed analysis and structured format.`,
          confidence: 'HIGH',
        },
      });
      msgIds.push(msg.id);
    }

    // Record 12 feedback signals
    for (const id of msgIds) {
      await service.recordFeedback(userId, orgId, id, 'UP');
    }

    const profile = await service.getPreferenceProfile(userId);

    expect(profile).toBeDefined();
    expect(typeof profile.summary).toBe('string');
    expect(profile.summary.length).toBeGreaterThan(0);
  });

  // ── FR-010 AC-4: Return preference profile for system prompt ──
  test('[FR-010][AC-4] returns preference profile for system prompt injection', async () => {
    expect(PreferenceLearningService).toBeDefined();
    const service = new PreferenceLearningService(prisma);

    const { userId, orgId, messageIds } =
      await createUserWithConversation();

    // Record some feedback
    await service.recordFeedback(userId, orgId, messageIds[0], 'UP');
    await service.recordFeedback(userId, orgId, messageIds[1], 'DOWN');

    const profile = await service.getPreferenceProfile(userId);

    expect(profile).toBeDefined();
    // Should have totalSignals count
    expect(typeof profile.totalSignals).toBe('number');
    // Should have a summary (even if short for few signals)
    expect(profile.summary).toBeDefined();
  });
});

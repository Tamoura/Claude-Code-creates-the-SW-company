/**
 * tests/unit/ai-feedback.test.ts — AI-powered feedback generator tests
 *
 * Tests personalized post-assessment feedback generation using OpenRouter.
 */

import {
  AIFeedbackGenerator,
  FeedbackRequest,
  FeedbackResult,
} from '../../src/services/ai-feedback';
import { OpenRouterClient } from '../../src/services/openrouter';
import { ScoredProfile, DimensionScores } from '../../src/services/scoring';

function makeStubClient(response: string): OpenRouterClient {
  return {
    chat: async () => response,
  } as unknown as OpenRouterClient;
}

const sampleProfile: ScoredProfile = {
  overallScore: 62.5,
  dimensionScores: {
    DELEGATION: 75.0,
    DESCRIPTION: 80.0,
    DISCERNMENT: 35.0,
    DILIGENCE: 60.0,
  },
  selfReportScores: {
    DELEGATION: 85.0,
    DESCRIPTION: 70.0,
    DISCERNMENT: 80.0,
    DILIGENCE: 75.0,
  },
  indicatorBreakdown: {
    'DEL_01': { shortCode: 'DEL_01', score: 0.9, status: 'PASS', track: 'OBSERVABLE' },
    'DISC_01': { shortCode: 'DISC_01', score: 0.2, status: 'FAIL', track: 'OBSERVABLE' },
  },
  discernmentGap: true,
};

const sampleRequest: FeedbackRequest = {
  profile: sampleProfile,
  userName: 'Alex',
};

describe('AIFeedbackGenerator', () => {
  test('should parse valid feedback JSON from AI', async () => {
    const aiResponse = JSON.stringify({
      summary: 'Alex, you show strong Description skills but need significant improvement in Discernment.',
      dimensionFeedback: {
        DELEGATION: 'You effectively identify tasks suitable for AI delegation.',
        DESCRIPTION: 'Your prompt crafting skills are above average.',
        DISCERNMENT: 'You tend to accept AI outputs without sufficient critical evaluation.',
        DILIGENCE: 'You demonstrate awareness of ethical considerations.',
      },
      topStrengths: ['Strong prompt engineering', 'Good task decomposition'],
      priorityImprovements: ['Critical evaluation of AI outputs', 'Identifying AI hallucinations'],
      discernmentGapWarning: 'Your self-assessment of Discernment (80%) is significantly higher than your behavioral score (35%), indicating a confidence-competence gap.',
      recommendedNextSteps: ['Complete the Discernment gap training module', 'Practice output verification exercises'],
    });
    const client = makeStubClient(aiResponse);
    const generator = new AIFeedbackGenerator(client);

    const result = await generator.generate(sampleRequest);

    expect(result.summary).toContain('Alex');
    expect(result.dimensionFeedback.DISCERNMENT).toContain('critical evaluation');
    expect(result.topStrengths).toHaveLength(2);
    expect(result.priorityImprovements).toHaveLength(2);
    expect(result.discernmentGapWarning).toContain('confidence-competence gap');
    expect(result.recommendedNextSteps).toHaveLength(2);
  });

  test('should include profile scores in the prompt to AI', async () => {
    let capturedMessages: unknown;
    const client = {
      chat: async (messages: unknown, _opts: unknown) => {
        capturedMessages = messages;
        return JSON.stringify({
          summary: 'Feedback',
          dimensionFeedback: { DELEGATION: '', DESCRIPTION: '', DISCERNMENT: '', DILIGENCE: '' },
          topStrengths: [],
          priorityImprovements: [],
          recommendedNextSteps: [],
        });
      },
    } as unknown as OpenRouterClient;
    const generator = new AIFeedbackGenerator(client);

    await generator.generate(sampleRequest);

    const msgs = capturedMessages as Array<{ role: string; content: string }>;
    const userMsg = msgs.find((m) => m.role === 'user')!;
    expect(userMsg.content).toContain('62.5');
    expect(userMsg.content).toContain('DELEGATION: 75');
    expect(userMsg.content).toContain('DISCERNMENT: 35');
    expect(userMsg.content).toContain('discernmentGap: true');
  });

  test('should return fallback feedback when AI returns invalid JSON', async () => {
    const client = makeStubClient('Not JSON');
    const generator = new AIFeedbackGenerator(client);

    const result = await generator.generate(sampleRequest);

    expect(result.summary).toContain('overall score of 62.5');
    expect(result.dimensionFeedback).toBeDefined();
    expect(result.topStrengths).toEqual([]);
    expect(result.priorityImprovements.length).toBeGreaterThan(0);
  });

  test('should return fallback feedback when AI client throws', async () => {
    const client = {
      chat: async () => { throw new Error('API down'); },
    } as unknown as OpenRouterClient;
    const generator = new AIFeedbackGenerator(client);

    const result = await generator.generate(sampleRequest);

    expect(result.summary).toContain('overall score of 62.5');
  });

  test('should identify weakest dimension for fallback improvements', async () => {
    const client = makeStubClient('invalid');
    const generator = new AIFeedbackGenerator(client);

    const result = await generator.generate(sampleRequest);

    // DISCERNMENT is lowest at 35.0
    expect(result.priorityImprovements).toContain('Focus on improving DISCERNMENT skills');
  });

  test('should include discernment gap warning in fallback when gap detected', async () => {
    const client = makeStubClient('invalid');
    const generator = new AIFeedbackGenerator(client);

    const result = await generator.generate(sampleRequest);

    expect(result.discernmentGapWarning).toContain('discernment gap');
  });

  test('should omit discernment gap warning when no gap', async () => {
    const profileNoGap: ScoredProfile = { ...sampleProfile, discernmentGap: false };
    const client = makeStubClient('invalid');
    const generator = new AIFeedbackGenerator(client);

    const result = await generator.generate({ profile: profileNoGap, userName: 'Test' });

    expect(result.discernmentGapWarning).toBeUndefined();
  });
});

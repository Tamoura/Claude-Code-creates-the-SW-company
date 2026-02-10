import { RiskFactor } from '../../src/modules/risk/schemas.js';

// Will be exported from service.ts after implementation
import {
  generateFallbackExplanation,
  generateAIExplanation,
} from '../../src/modules/risk/service.js';

const sampleFactors: RiskFactor[] = [
  { name: 'Velocity Trend', score: 55, weight: 0.25, detail: 'Velocity down 15%' },
  { name: 'PR Review Backlog', score: 40, weight: 0.20, detail: '3 PRs waiting' },
  { name: 'Cycle Time Trend', score: 30, weight: 0.15, detail: 'Cycle time up 20%' },
  { name: 'Commit Frequency Drop', score: 20, weight: 0.15, detail: 'Slight drop' },
  { name: 'Test Coverage Delta', score: 10, weight: 0.10, detail: 'Coverage stable' },
  { name: 'Large PR Ratio', score: 5, weight: 0.10, detail: 'Low ratio' },
  { name: 'Review Load Imbalance', score: 0, weight: 0.05, detail: 'Balanced' },
];

describe('generateFallbackExplanation', () => {
  it('returns zero-risk message when score is 0', () => {
    const result = generateFallbackExplanation(0, 'low', sampleFactors);
    expect(result).toBe('Sprint risk is 0 (low). No risk factors detected.');
  });

  it('includes top factors sorted by contribution', () => {
    const result = generateFallbackExplanation(42, 'medium', sampleFactors);
    expect(result).toContain('Sprint risk is 42 (medium)');
    expect(result).toContain('Velocity Trend');
    expect(result).toContain('PR Review Backlog');
  });

  it('handles all-zero factors gracefully', () => {
    const zeroFactors = sampleFactors.map(f => ({ ...f, score: 0 }));
    const result = generateFallbackExplanation(0, 'low', zeroFactors);
    expect(result).toContain('No risk factors detected');
  });
});

describe('generateAIExplanation', () => {
  const aiConfig = { apiKey: 'test-key', model: 'test-model' };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed explanation and recommendations from OpenRouter', async () => {
    const aiResponse = {
      explanation: 'Sprint is at moderate risk due to velocity decline.',
      recommendations: [
        'Reassign 2 PRs to unblock review queue',
        'Consider reducing sprint scope by 3 story points',
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: JSON.stringify(aiResponse) },
        }],
      }),
    });

    const result = await generateAIExplanation(aiConfig, 42, 'medium', sampleFactors);
    expect(result.explanation).toBe(aiResponse.explanation);
    expect(result.recommendations).toEqual(aiResponse.recommendations);
  });

  it('throws on fetch failure (caller handles fallback)', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      generateAIExplanation(aiConfig, 42, 'medium', sampleFactors)
    ).rejects.toThrow('Network error');
  });

  it('throws on non-200 response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    await expect(
      generateAIExplanation(aiConfig, 42, 'medium', sampleFactors)
    ).rejects.toThrow('OpenRouter 429');
  });

  it('throws on invalid JSON in AI response content', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'This is not JSON' },
        }],
      }),
    });

    await expect(
      generateAIExplanation(aiConfig, 42, 'medium', sampleFactors)
    ).rejects.toThrow();
  });

  it('returns defaults when AI response has missing fields', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: JSON.stringify({ explanation: 'Risk is moderate.' }) },
        }],
      }),
    });

    const result = await generateAIExplanation(aiConfig, 42, 'medium', sampleFactors);
    expect(result.explanation).toBe('Risk is moderate.');
    expect(result.recommendations).toEqual([]);
  });
});

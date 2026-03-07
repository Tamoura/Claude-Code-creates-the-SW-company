/**
 * tests/unit/ai-evaluator.test.ts — AI-powered response evaluator tests
 *
 * Tests the AI evaluator that scores free-text responses against
 * behavioral indicators using OpenRouter.
 */

import {
  AIEvaluator,
  EvaluationResult,
  EvaluationRequest,
} from '../../src/services/ai-evaluator';
import { OpenRouterClient } from '../../src/services/openrouter';

function makeStubClient(response: string): OpenRouterClient {
  return {
    chat: async () => response,
  } as unknown as OpenRouterClient;
}

describe('AIEvaluator', () => {
  const validRequest: EvaluationRequest = {
    response: 'I would first break the task into smaller subtasks and identify which parts require human judgment vs which can be delegated to AI.',
    dimension: 'DELEGATION',
    indicatorName: 'Task decomposition',
    indicatorDescription: 'Ability to break complex tasks into AI-suitable subtasks while retaining human oversight on judgment-heavy decisions.',
    questionText: 'You need to prepare a quarterly business report. Describe how you would use AI to help with this task.',
  };

  test('should parse a valid JSON evaluation response', async () => {
    const aiResponse = JSON.stringify({
      score: 0.85,
      rationale: 'The response demonstrates strong task decomposition skills with clear separation of AI-suitable and human-judgment tasks.',
      strengths: ['Clear subtask identification', 'Appropriate human oversight'],
      improvements: ['Could specify which AI tools to use'],
    });
    const client = makeStubClient(aiResponse);
    const evaluator = new AIEvaluator(client);

    const result = await evaluator.evaluate(validRequest);

    expect(result.score).toBe(0.85);
    expect(result.rationale).toContain('task decomposition');
    expect(result.strengths).toHaveLength(2);
    expect(result.improvements).toHaveLength(1);
  });

  test('should clamp score to 0.0-1.0 range', async () => {
    const aiResponse = JSON.stringify({
      score: 1.5,
      rationale: 'Excellent',
      strengths: [],
      improvements: [],
    });
    const client = makeStubClient(aiResponse);
    const evaluator = new AIEvaluator(client);

    const result = await evaluator.evaluate(validRequest);
    expect(result.score).toBe(1.0);
  });

  test('should clamp negative score to 0.0', async () => {
    const aiResponse = JSON.stringify({
      score: -0.5,
      rationale: 'Poor',
      strengths: [],
      improvements: [],
    });
    const client = makeStubClient(aiResponse);
    const evaluator = new AIEvaluator(client);

    const result = await evaluator.evaluate(validRequest);
    expect(result.score).toBe(0.0);
  });

  test('should return fallback result when AI returns invalid JSON', async () => {
    const client = makeStubClient('This is not valid JSON at all');
    const evaluator = new AIEvaluator(client);

    const result = await evaluator.evaluate(validRequest);

    expect(result.score).toBe(0.5);
    expect(result.rationale).toContain('could not be automatically evaluated');
    expect(result.strengths).toEqual([]);
    expect(result.improvements).toEqual([]);
  });

  test('should return fallback result when AI client throws', async () => {
    const client = {
      chat: async () => { throw new Error('Network error'); },
    } as unknown as OpenRouterClient;
    const evaluator = new AIEvaluator(client);

    const result = await evaluator.evaluate(validRequest);

    expect(result.score).toBe(0.5);
    expect(result.rationale).toContain('could not be automatically evaluated');
  });

  test('should include dimension and indicator in the prompt', async () => {
    let capturedMessages: unknown;
    const client = {
      chat: async (messages: unknown, _opts: unknown) => {
        capturedMessages = messages;
        return JSON.stringify({
          score: 0.7,
          rationale: 'Good',
          strengths: [],
          improvements: [],
        });
      },
    } as unknown as OpenRouterClient;
    const evaluator = new AIEvaluator(client);

    await evaluator.evaluate(validRequest);

    const msgs = capturedMessages as Array<{ role: string; content: string }>;
    const userMsg = msgs.find((m) => m.role === 'user')!;
    expect(userMsg.content).toContain('DELEGATION');
    expect(userMsg.content).toContain('Task decomposition');
    expect(userMsg.content).toContain(validRequest.response);
  });

  test('should pass systemPrompt option to client', async () => {
    let capturedOpts: unknown;
    const client = {
      chat: async (_messages: unknown, opts: unknown) => {
        capturedOpts = opts;
        return JSON.stringify({
          score: 0.7,
          rationale: 'Good',
          strengths: [],
          improvements: [],
        });
      },
    } as unknown as OpenRouterClient;
    const evaluator = new AIEvaluator(client);

    await evaluator.evaluate(validRequest);

    expect((capturedOpts as { systemPrompt: string }).systemPrompt).toBeDefined();
    expect((capturedOpts as { systemPrompt: string }).systemPrompt).toContain('AI Fluency');
  });

  test('should handle AI response with missing fields gracefully', async () => {
    const aiResponse = JSON.stringify({ score: 0.6 });
    const client = makeStubClient(aiResponse);
    const evaluator = new AIEvaluator(client);

    const result = await evaluator.evaluate(validRequest);

    expect(result.score).toBe(0.6);
    expect(result.rationale).toBe('');
    expect(result.strengths).toEqual([]);
    expect(result.improvements).toEqual([]);
  });
});

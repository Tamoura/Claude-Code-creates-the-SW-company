import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentContext, Task } from '../types';

// Mock the AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock agent prompts
vi.mock('../agent-prompts', () => ({
  getAgentPrompt: vi.fn((role: string) => `You are the ${role} agent.`),
}));

describe('ClaudeAgent', () => {
  const mockTask: Task = {
    id: 'plan',
    title: 'Create project plan',
    description: 'Plan a todo app',
    agentRole: 'product-manager',
    dependsOn: [],
    status: 'pending',
    parallelOk: false,
  };

  const mockModel = { doGenerate: vi.fn(), modelId: 'test-model' };

  const mockContext: AgentContext = {
    projectId: 'proj_123',
    conversationHistory: [{ role: 'user', content: 'Build me a todo app' }],
    files: {},
    previousResults: [],
    model: mockModel,
    modelName: 'test-model',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have the correct role', async () => {
    const { ClaudeAgent } = await import('../claude-agent');
    const agent = new ClaudeAgent('product-manager');

    expect(agent.role).toBe('product-manager');
  });

  it('should call generateText with system prompt and task context', async () => {
    const { generateText } = await import('ai');
    const { ClaudeAgent } = await import('../claude-agent');

    vi.mocked(generateText).mockResolvedValue({
      text: 'Here is the plan for your todo app...',
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    } as any);

    const agent = new ClaudeAgent('product-manager');
    const result = await agent.execute(mockTask, mockContext);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('product-manager'),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
        ]),
      }),
    );

    expect(result.role).toBe('product-manager');
    expect(result.content).toBe('Here is the plan for your todo app...');
    expect(result.tokensIn).toBe(100);
    expect(result.tokensOut).toBe(200);
  });

  it('should include task description in the user message', async () => {
    const { generateText } = await import('ai');
    const { ClaudeAgent } = await import('../claude-agent');

    vi.mocked(generateText).mockResolvedValue({
      text: 'result',
      usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
    } as any);

    const agent = new ClaudeAgent('product-manager');
    await agent.execute(mockTask, mockContext);

    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const messages = callArgs.messages;
    const lastMessage = messages[messages.length - 1];

    expect(lastMessage.content).toContain(mockTask.description);
  });

  it('should include previous agent results as context', async () => {
    const { generateText } = await import('ai');
    const { ClaudeAgent } = await import('../claude-agent');

    vi.mocked(generateText).mockResolvedValue({
      text: 'architecture design',
      usage: { promptTokens: 200, completionTokens: 300, totalTokens: 500 },
    } as any);

    const contextWithPrevious: AgentContext = {
      ...mockContext,
      previousResults: [
        {
          role: 'product-manager',
          content: 'Plan: Build a todo app with auth',
          artifacts: [],
          tokensIn: 100,
          tokensOut: 200,
          durationMs: 1000,
        },
      ],
    };

    const agent = new ClaudeAgent('architect');
    await agent.execute(
      { ...mockTask, id: 'design', agentRole: 'architect' },
      contextWithPrevious,
    );

    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const systemPrompt = callArgs.system;

    expect(systemPrompt).toContain('product-manager');
    expect(systemPrompt).toContain('Plan: Build a todo app with auth');
  });
});

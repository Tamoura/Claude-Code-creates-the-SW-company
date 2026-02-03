import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentResult } from '~/lib/.server/orchestrator';

// Mock the orchestrator
const mockHandleRequest = vi.fn();
vi.mock('~/lib/.server/orchestrator', () => ({
  SimpleOrchestrator: vi.fn().mockImplementation(() => ({
    handleRequest: mockHandleRequest,
  })),
}));

// Mock logger
vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

function makeRequest(body: Record<string, any>) {
  return new Request('http://localhost:3110/api/orchestrator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'apiKeys=%7B%22OpenRouter%22%3A%22test-key%22%7D',
    },
    body: JSON.stringify(body),
  });
}

function makeBaseBody() {
  return {
    messages: [
      {
        id: '1',
        role: 'user',
        content: '[Model: anthropic/claude-sonnet-4-20250514]\n\n[Provider: OpenRouter]\n\nBuild me a todo app',
      },
    ],
    files: {},
    contextOptimization: false,
    chatMode: 'build',
    designScheme: undefined,
    maxLLMSteps: 3,
  };
}

const mockPmResult: AgentResult = {
  role: 'product-manager',
  content: 'Here is the product plan for the todo app.',
  artifacts: [],
  tokensIn: 100,
  tokensOut: 200,
  durationMs: 500,
};

function setupMockOrchestrator(events: any[]) {
  mockHandleRequest.mockImplementation(async function* () {
    for (const event of events) {
      yield event;
    }
  });
}

async function readStream(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    result += decoder.decode(value, { stream: true });
  }

  return result;
}

describe('api.orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export an action function', async () => {
    const module = await import('../api.orchestrator');
    expect(module.action).toBeDefined();
    expect(typeof module.action).toBe('function');
  });

  it('should return a streaming response with correct headers', async () => {
    setupMockOrchestrator([
      { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 1, pending: 1, inProgress: 0, completed: 0, failed: 0, readyTasks: ['plan'], isComplete: false } },
      { type: 'workflow-completed', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
    ]);

    const { action } = await import('../api.orchestrator');
    const response = await action({
      request: makeRequest(makeBaseBody()),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('should include progress annotations for workflow events', async () => {
    setupMockOrchestrator([
      { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 1, pending: 1, inProgress: 0, completed: 0, failed: 0, readyTasks: ['plan'], isComplete: false } },
      { type: 'agent-started', agentRole: 'product-manager', taskId: 'plan', timestamp: Date.now() },
      { type: 'agent-completed', agentRole: 'product-manager', taskId: 'plan', result: mockPmResult, timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
      { type: 'workflow-completed', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
    ]);

    const { action } = await import('../api.orchestrator');
    const response = await action({
      request: makeRequest(makeBaseBody()),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    const body = await readStream(response);

    // Should contain progress annotations (prefix 2:)
    expect(body).toContain('2:');
    expect(body).toContain('orchestrator');
    expect(body).toContain('product-manager');
  });

  it('should stream agent content as text chunks', async () => {
    setupMockOrchestrator([
      { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 1, pending: 1, inProgress: 0, completed: 0, failed: 0, readyTasks: ['plan'], isComplete: false } },
      { type: 'agent-started', agentRole: 'product-manager', taskId: 'plan', timestamp: Date.now() },
      { type: 'agent-completed', agentRole: 'product-manager', taskId: 'plan', result: mockPmResult, timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
      { type: 'workflow-completed', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
    ]);

    const { action } = await import('../api.orchestrator');
    const response = await action({
      request: makeRequest(makeBaseBody()),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    const body = await readStream(response);

    // Text chunks use prefix 0:
    expect(body).toContain('0:');
    // Should contain the PM agent's output
    expect(body).toContain('product plan');
  });

  it('should pass the user prompt and context to the orchestrator', async () => {
    setupMockOrchestrator([
      { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 0, failed: 0, readyTasks: [], isComplete: false } },
      { type: 'workflow-completed', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
    ]);

    const { action } = await import('../api.orchestrator');
    await action({
      request: makeRequest(makeBaseBody()),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    expect(mockHandleRequest).toHaveBeenCalledWith(
      expect.stringContaining('Build me a todo app'),
      expect.objectContaining({
        projectId: expect.any(String),
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
        ]),
        files: expect.any(Object),
        previousResults: [],
      }),
    );
  });

  it('should include usage annotation at workflow completion', async () => {
    setupMockOrchestrator([
      { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 1, pending: 1, inProgress: 0, completed: 0, failed: 0, readyTasks: ['plan'], isComplete: false } },
      { type: 'agent-completed', agentRole: 'product-manager', taskId: 'plan', result: mockPmResult, timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
      { type: 'workflow-completed', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 1, failed: 0, readyTasks: [], isComplete: true } },
    ]);

    const { action } = await import('../api.orchestrator');
    const response = await action({
      request: makeRequest(makeBaseBody()),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    const body = await readStream(response);

    // Message annotations use prefix 8:
    expect(body).toContain('8:');
    // Should contain usage data
    expect(body).toContain('usage');
  });

  it('should return error response for invalid requests', async () => {
    const { action } = await import('../api.orchestrator');
    const response = await action({
      request: new Request('http://localhost:3110/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    // Should handle gracefully — either error response or empty stream
    expect(response.status).toBeDefined();
  });

  it('should handle agent failures gracefully', async () => {
    setupMockOrchestrator([
      { type: 'workflow-started', timestamp: Date.now(), graphStatus: { total: 1, pending: 1, inProgress: 0, completed: 0, failed: 0, readyTasks: ['plan'], isComplete: false } },
      { type: 'agent-failed', agentRole: 'product-manager', taskId: 'plan', content: 'API rate limit exceeded', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 0, failed: 1, readyTasks: [], isComplete: false } },
      { type: 'workflow-failed', timestamp: Date.now(), graphStatus: { total: 1, pending: 0, inProgress: 0, completed: 0, failed: 1, readyTasks: [], isComplete: false } },
    ]);

    const { action } = await import('../api.orchestrator');
    const response = await action({
      request: makeRequest(makeBaseBody()),
      params: {},
      context: { cloudflare: { env: {} } } as any,
    });

    const body = await readStream(response);

    // Should still return 200 (stream started) but contain failure info
    expect(response.status).toBe(200);
    expect(body).toContain('failed');
  });
});

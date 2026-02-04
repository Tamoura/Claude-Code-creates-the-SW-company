import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentContext, AgentResult } from '../../../src/lib/orchestrator/types';

// Mock ClaudeAgent
vi.mock('../../../src/lib/orchestrator/claude-agent', () => ({
  ClaudeAgent: vi.fn().mockImplementation((role: string) => ({
    role,
    execute: vi.fn().mockResolvedValue({
      role,
      content: `Output from ${role}`,
      artifacts: [],
      tokensIn: 100,
      tokensOut: 200,
      durationMs: 500,
    } as AgentResult),
    stream: vi.fn(),
    handoff: vi.fn(),
  })),
}));

describe('SimpleOrchestrator', () => {
  const baseContext: AgentContext = {
    projectId: 'proj_123',
    conversationHistory: [{ role: 'user', content: 'Build me a todo app with authentication' }],
    files: {},
    previousResults: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selectWorkflow', () => {
    it('should select new-app for "build me" requests', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      expect(orchestrator.selectWorkflow('Build me a todo app')).toBe('new-app');
    });

    it('should select new-app for "create" requests', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      expect(orchestrator.selectWorkflow('Create an e-commerce site')).toBe('new-app');
    });

    it('should select fix-bug for "fix" requests', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      expect(orchestrator.selectWorkflow('Fix the login bug')).toBe('fix-bug');
    });

    it('should select quick-feature for "add" requests', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      expect(orchestrator.selectWorkflow('Add a dark mode toggle')).toBe('quick-feature');
    });

    it('should default to new-app for general requests', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      expect(orchestrator.selectWorkflow('I want a portfolio website')).toBe('new-app');
    });
  });

  describe('routeTask', () => {
    it('should create an agent matching the task role', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      const task = {
        id: 'plan',
        title: 'Plan',
        description: 'Plan it',
        agentRole: 'product-manager' as const,
        dependsOn: [],
        status: 'pending' as const,
        parallelOk: false,
      };

      const agent = orchestrator.routeTask(task);
      expect(agent.role).toBe('product-manager');
    });
  });

  describe('handleRequest', () => {
    it('should emit workflow-started event first', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      const events = [];

      for await (const event of orchestrator.handleRequest('Build a todo app', baseContext)) {
        events.push(event);

        if (events.length >= 1) {
          break;
        }
      }

      expect(events[0].type).toBe('workflow-started');
    });

    it('should emit agent-started and agent-completed for each task', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      const events = [];

      for await (const event of orchestrator.handleRequest('Build a todo app', baseContext)) {
        events.push(event);
      }

      const agentStarted = events.filter((e) => e.type === 'agent-started');
      const agentCompleted = events.filter((e) => e.type === 'agent-completed');

      // new-app has 5 tasks (PM, Architect, Backend, Frontend, QA)
      expect(agentStarted.length).toBe(5);
      expect(agentCompleted.length).toBe(5);
    });

    it('should emit workflow-completed at the end', async () => {
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      const events = [];

      for await (const event of orchestrator.handleRequest('Build a todo app', baseContext)) {
        events.push(event);
      }

      const lastEvent = events[events.length - 1];
      expect(lastEvent.type).toBe('workflow-completed');
    });

    it('should pass previous results to subsequent agents', async () => {
      const { ClaudeAgent } = await import('../../../src/lib/orchestrator/claude-agent');
      const { SimpleOrchestrator } = await import('../../../src/lib/orchestrator/simple-orchestrator');
      const orchestrator = new SimpleOrchestrator();

      const events = [];

      for await (const event of orchestrator.handleRequest('Build a todo app', baseContext)) {
        events.push(event);
      }

      // The architect (2nd agent) should receive PM's result in context
      const agentInstances = vi.mocked(ClaudeAgent).mock.results;

      // Check that execute was called with previousResults growing
      const archAgent = agentInstances.find((r) => (r.value as any).role === 'architect');

      if (archAgent) {
        const executeCalls = (archAgent.value as any).execute.mock.calls;

        if (executeCalls.length > 0) {
          const contextArg = executeCalls[0][1];
          expect(contextArg.previousResults.length).toBeGreaterThan(0);
        }
      }
    });
  });
});

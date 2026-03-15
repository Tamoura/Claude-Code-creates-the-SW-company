/**
 * Advisory Agent Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-001 (Advisory AI Agent with routing + synthesis)
 *   FR-009 (Org Context Injection)
 *
 * Tests the agent state schema, router node (intent classification),
 * and synthesizer node (response composition with citations).
 *
 * These tests use injected dependencies for deterministic behavior.
 * No external LLM calls are made.
 *
 * [IMPL-028]
 */

// Agent modules — will be created during Green phase
let AgentState: typeof import('../../src/agent/state');
let routerModule: typeof import('../../src/agent/nodes/router');
let synthesizerModule: typeof import('../../src/agent/nodes/synthesizer');

beforeAll(async () => {
  try {
    AgentState = await import('../../src/agent/state');
  } catch {
    // Expected to fail in Red phase
  }
  try {
    routerModule = await import('../../src/agent/nodes/router');
  } catch {
    // Expected to fail in Red phase
  }
  try {
    synthesizerModule = await import('../../src/agent/nodes/synthesizer');
  } catch {
    // Expected to fail in Red phase
  }
});

// ---------- suite ----------

describe('AdvisoryAgent', () => {
  describe('AgentState', () => {
    test('[FR-001][AC-1] state schema has required fields (messages, orgContext, toolResults, citations)', () => {
      expect(AgentState).toBeDefined();

      // Verify the createInitialState factory exists and returns
      // the correct shape
      expect(typeof AgentState.createInitialState).toBe('function');

      const state = AgentState.createInitialState();

      expect(state).toHaveProperty('messages');
      expect(state).toHaveProperty('orgContext');
      expect(state).toHaveProperty('toolResults');
      expect(state).toHaveProperty('citations');
      expect(state).toHaveProperty('confidence');

      // Default values
      expect(Array.isArray(state.messages)).toBe(true);
      expect(state.messages).toHaveLength(0);
      expect(state.orgContext).toBe('');
      expect(Array.isArray(state.toolResults)).toBe(true);
      expect(state.toolResults).toHaveLength(0);
      expect(Array.isArray(state.citations)).toBe(true);
      expect(state.citations).toHaveLength(0);
      expect(state.confidence).toBe('low');
    });
  });

  describe('routerNode', () => {
    test('[FR-001][AC-2] routes RAG queries to rag-search tool', () => {
      expect(routerModule).toBeDefined();
      const { routerNode } = routerModule;

      const result = routerNode('What are best practices for API versioning?');
      expect(result).toBe('rag-search');

      const result2 = routerNode('How to implement circuit breakers?');
      expect(result2).toBe('rag-search');

      const result3 = routerNode('What is the recommended approach for caching?');
      expect(result3).toBe('rag-search');
    });

    test('[FR-001][AC-3] routes risk questions to risk-advisor tool', () => {
      expect(routerModule).toBeDefined();
      const { routerNode } = routerModule;

      const result = routerNode('What are the security risks of using MongoDB?');
      expect(result).toBe('risk-advisor');

      const result2 = routerNode('Assess our vulnerability to supply chain attacks');
      expect(result2).toBe('risk-advisor');

      const result3 = routerNode('How can we improve compliance with SOC2?');
      expect(result3).toBe('risk-advisor');
    });

    test('[FR-001][AC-4] routes cost questions to cost-analyzer tool', () => {
      expect(routerModule).toBeDefined();
      const { routerNode } = routerModule;

      const result = routerNode('What is the TCO of migrating to Kubernetes?');
      expect(result).toBe('cost-analyzer');

      const result2 = routerNode('How can we reduce our cloud spend?');
      expect(result2).toBe('cost-analyzer');

      const result3 = routerNode('Calculate the ROI of switching to serverless');
      expect(result3).toBe('cost-analyzer');
    });

    test('[FR-001][AC-5] routes tech questions to radar-lookup tool', () => {
      expect(routerModule).toBeDefined();
      const { routerNode } = routerModule;

      const result = routerNode('Should we adopt Rust for our backend?');
      expect(result).toBe('radar-lookup');

      const result2 = routerNode('What technology should we use for real-time messaging?');
      expect(result2).toBe('radar-lookup');

      const result3 = routerNode('Assess whether to adopt gRPC as a framework');
      expect(result3).toBe('radar-lookup');
    });

    test('[FR-001][AC-6] routes general questions directly to synthesizer', () => {
      expect(routerModule).toBeDefined();
      const { routerNode } = routerModule;

      const result = routerNode('Hello, how are you?');
      expect(result).toBe('synthesizer');

      const result2 = routerNode('Thanks for the help');
      expect(result2).toBe('synthesizer');
    });
  });

  describe('synthesizerNode', () => {
    test('[FR-009][AC-1] injects org context into system prompt', async () => {
      expect(synthesizerModule).toBeDefined();
      const { synthesizerNode } = synthesizerModule;

      // Track what the LLM receives
      let capturedPrompt = '';
      const fakeLLM = async (systemPrompt: string, _userMessage: string) => {
        capturedPrompt = systemPrompt;
        return 'Test response';
      };

      const orgContext = 'Company: Acme Corp\nIndustry: FinTech\nTeam Size: 50 employees';

      await synthesizerNode({
        messages: [{ role: 'user', content: 'How should I structure my API?' }],
        orgContext,
        toolResults: [],
        citations: [],
        confidence: 'low',
        llmProvider: fakeLLM,
      });

      // System prompt should contain the org context
      expect(capturedPrompt).toContain('Acme Corp');
      expect(capturedPrompt).toContain('FinTech');
      expect(capturedPrompt).toContain('50 employees');
    });

    test('[FR-001][AC-7] composes response with citations when available', async () => {
      expect(synthesizerModule).toBeDefined();
      const { synthesizerNode } = synthesizerModule;

      const fakeLLM = async (_systemPrompt: string, _userMessage: string) => {
        return 'Based on the knowledge base, microservices provide better scalability [1].';
      };

      const result = await synthesizerNode({
        messages: [{ role: 'user', content: 'Should we use microservices?' }],
        orgContext: 'Company: Test Co',
        toolResults: [
          {
            tool: 'rag-search',
            data: 'Microservices allow independent deployment and scaling.',
          },
        ],
        citations: [
          {
            marker: '[1]',
            chunkContent: 'Microservices allow independent deployment and scaling.',
            sourceTitle: 'Architecture Patterns',
            author: 'Martin Fowler',
            publishedDate: null,
            relevanceScore: 0.85,
          },
        ],
        confidence: 'high',
        llmProvider: fakeLLM,
      });

      expect(result.response).toContain('microservices');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].sourceTitle).toBe('Architecture Patterns');
    });

    test('[FR-001][AC-8] adds confidence indicator to response', async () => {
      expect(synthesizerModule).toBeDefined();
      const { synthesizerNode } = synthesizerModule;

      const fakeLLM = async () => 'Some advisory response';

      // High confidence (citations with high scores)
      const highResult = await synthesizerNode({
        messages: [{ role: 'user', content: 'Question' }],
        orgContext: '',
        toolResults: [{ tool: 'rag-search', data: 'relevant content' }],
        citations: [
          {
            marker: '[1]',
            chunkContent: 'content',
            sourceTitle: 'Source',
            author: null,
            publishedDate: null,
            relevanceScore: 0.9,
          },
        ],
        confidence: 'high',
        llmProvider: fakeLLM,
      });

      expect(highResult.confidence).toBe('high');

      // Low confidence (no citations)
      const lowResult = await synthesizerNode({
        messages: [{ role: 'user', content: 'Random question' }],
        orgContext: '',
        toolResults: [],
        citations: [],
        confidence: 'low',
        llmProvider: fakeLLM,
      });

      expect(lowResult.confidence).toBe('low');
    });
  });
});

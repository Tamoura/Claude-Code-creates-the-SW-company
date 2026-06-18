/**
 * Advisory Agent Graph — State Machine Orchestration
 *
 * Implements the agent flow as a simple state machine:
 *   input -> router -> tool (optional) -> synthesizer -> output
 *
 * No actual LangGraph library dependency — this is a lightweight
 * state machine that matches the interface for future migration.
 *
 * [IMPL-032][FR-001][FR-002][US-01][US-02]
 */

import { RAGQueryService } from '../services/rag-query.service';
import { DataSanitizer } from '../services/data-sanitizer';
import {
  AgentState,
  ToolResult,
  createInitialState,
} from './state';
import { routerNode, ToolRoute } from './nodes/router';
import {
  synthesizerNode,
  LLMProvider,
  SynthesizerOutput,
  AI_DISCLAIMER,
} from './nodes/synthesizer';
import { createRAGSearchTool } from './tools/rag-search';

// --------------- types ---------------

export interface AdvisoryAgentDeps {
  ragQueryService: RAGQueryService;
  dataSanitizer: DataSanitizer;
  llmProvider: LLMProvider;
}

export interface AgentResponse {
  response: string;
  citations: SynthesizerOutput['citations'];
  confidence: SynthesizerOutput['confidence'];
  disclaimer: string;
  route: ToolRoute;
}

// --------------- factory ---------------

/**
 * Create an advisory agent that processes a user message
 * through the router -> tool -> synthesizer pipeline.
 */
export function createAdvisoryAgent(deps: AdvisoryAgentDeps) {
  const ragSearchTool = createRAGSearchTool(deps.ragQueryService);

  return {
    /**
     * Process a single user message and return an advisory response.
     */
    async run(
      userMessage: string,
      orgContext: string
    ): Promise<AgentResponse> {
      // 1. Sanitize user input before processing
      const sanitizedMessage = deps.dataSanitizer.sanitize(userMessage);

      // 2. Initialize state
      const state = createInitialState({
        messages: [{ role: 'user', content: sanitizedMessage }],
        orgContext,
      });

      // 3. Route the query
      const route = routerNode(sanitizedMessage);

      // 4. Execute tool if needed
      if (route === 'rag-search') {
        const queryResult = await ragSearchTool.execute(sanitizedMessage);
        state.toolResults = queryResult.chunks.map((c): ToolResult => ({
          tool: 'rag-search',
          data: c.content,
        }));
        state.citations = queryResult.citations;

        // Set confidence based on grounding
        state.confidence =
          queryResult.groundingLabel === 'grounded' ? 'high' : 'medium';
      }
      // Other tools (risk-advisor, cost-analyzer, radar-lookup) are
      // placeholders for future implementation. For now they fall
      // through to the synthesizer with no tool results.

      // 5. Synthesize response
      const synthResult = await synthesizerNode({
        ...state,
        llmProvider: deps.llmProvider,
      });

      return {
        response: synthResult.response,
        citations: synthResult.citations,
        confidence: synthResult.confidence,
        disclaimer: AI_DISCLAIMER,
        route,
      };
    },
  };
}

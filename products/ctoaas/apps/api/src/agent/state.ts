/**
 * Advisory Agent State
 *
 * Defines the state schema for the advisory agent graph.
 * All state is passed between nodes as a single object.
 *
 * [IMPL-032][FR-001][US-01]
 */

import { Citation } from '../services/rag-query.service';

// --------------- types ---------------

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolResult {
  tool: string;
  data: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AgentState {
  messages: AgentMessage[];
  orgContext: string;
  toolResults: ToolResult[];
  citations: Citation[];
  confidence: ConfidenceLevel;
}

// --------------- factory ---------------

/**
 * Create a fresh initial state with all fields set to defaults.
 */
export function createInitialState(
  overrides?: Partial<AgentState>
): AgentState {
  return {
    messages: [],
    orgContext: '',
    toolResults: [],
    citations: [],
    confidence: 'low',
    ...overrides,
  };
}

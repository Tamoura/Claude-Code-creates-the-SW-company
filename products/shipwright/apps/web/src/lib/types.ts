export type AgentRole =
  | 'product-manager'
  | 'architect'
  | 'backend-engineer'
  | 'frontend-engineer'
  | 'qa-engineer';

export type AgentStatus = 'waiting' | 'working' | 'done' | 'failed';

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  tokensIn: number;
  tokensOut: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentRole?: AgentRole;
}

export interface OrchestratorState {
  messages: ChatMessage[];
  agentStates: AgentState[];
  files: Map<string, string>;
  isStreaming: boolean;
  totalTokensIn: number;
  totalTokensOut: number;
}

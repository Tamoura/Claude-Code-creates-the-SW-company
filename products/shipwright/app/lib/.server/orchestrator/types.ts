// ============================================================
// Shipwright Orchestrator Type System
// ============================================================
// These interfaces define the abstraction layer between
// Shipwright and any underlying agentic framework.
// MVP: direct Claude API calls via Vercel AI SDK.
// Future: swap to LangChain.js, LangGraph, or CrewAI.
// ============================================================

// --- Agent Types ---

export type AgentRole =
  | 'product-manager'
  | 'architect'
  | 'backend-engineer'
  | 'frontend-engineer'
  | 'qa-engineer';

export interface AgentContext {
  projectId: string;
  conversationHistory: Message[];
  files: Record<string, string>;
  previousResults: AgentResult[];
  model?: string;
  provider?: string;
  apiKeys?: Record<string, string>;
}

export interface AgentResult {
  role: AgentRole;
  content: string;
  artifacts: Artifact[];
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
}

export interface StreamChunk {
  type: 'text' | 'artifact-start' | 'artifact-end' | 'action-start' | 'action-end' | 'status';
  content: string;
  agentRole: AgentRole;
  timestamp: number;
}

export interface HandoffPayload {
  fromAgent: AgentRole;
  toAgent: AgentRole;
  context: string;
  artifacts: Artifact[];
}

export interface Agent {
  readonly role: AgentRole;
  execute(task: Task, context: AgentContext): Promise<AgentResult>;
  stream(task: Task, context: AgentContext): AsyncIterable<StreamChunk>;
  handoff(toAgent: AgentRole, payload: HandoffPayload): Promise<void>;
}

// --- Workflow / Task Graph Types ---

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

export interface Task {
  id: string;
  title: string;
  description: string;
  agentRole: AgentRole;
  dependsOn: string[];
  status: TaskStatus;
  result?: AgentResult;
  parallelOk: boolean;
}

export interface TaskGraph {
  id: string;
  workflowType: string;
  tasks: Map<string, Task>;
  createdAt: number;
}

export type GraphStatus = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  readyTasks: string[];
  isComplete: boolean;
};

export interface WorkflowEngine {
  loadGraph(template: string, vars: Record<string, string>): TaskGraph;
  getReadyTasks(graph: TaskGraph): Task[];
  markComplete(graph: TaskGraph, taskId: string, result: AgentResult): void;
  markFailed(graph: TaskGraph, taskId: string, error: string): void;
  getStatus(graph: TaskGraph): GraphStatus;
}

// --- Orchestrator Types ---

export type OrchestratorEventType =
  | 'workflow-started'
  | 'agent-started'
  | 'agent-streaming'
  | 'agent-completed'
  | 'agent-failed'
  | 'handoff'
  | 'workflow-completed'
  | 'workflow-failed';

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  agentRole?: AgentRole;
  taskId?: string;
  content?: string;
  chunk?: StreamChunk;
  result?: AgentResult;
  graphStatus?: GraphStatus;
  timestamp: number;
}

export interface Orchestrator {
  handleRequest(prompt: string, context: AgentContext): AsyncIterable<OrchestratorEvent>;
  selectWorkflow(prompt: string): string;
  routeTask(task: Task): Agent;
}

// --- Shared Types ---

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Artifact {
  id: string;
  title: string;
  actions: ArtifactAction[];
}

export interface ArtifactAction {
  type: 'file' | 'shell' | 'start' | 'build';
  filePath?: string;
  content: string;
}

// --- Workflow Templates ---

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  tasks: Omit<Task, 'status' | 'result'>[];
}

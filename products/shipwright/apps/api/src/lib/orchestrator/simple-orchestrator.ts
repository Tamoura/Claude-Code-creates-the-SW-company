import type {
  Orchestrator,
  OrchestratorEvent,
  AgentContext,
  Agent,
  Task,
} from './types';
import { ClaudeAgent } from './claude-agent';
import { TaskGraphWorkflowEngine } from './task-graph-engine';

export class SimpleOrchestrator implements Orchestrator {
  private engine: TaskGraphWorkflowEngine;

  constructor() {
    this.engine = new TaskGraphWorkflowEngine();
  }

  selectWorkflow(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (lower.includes('fix') || lower.includes('bug') || lower.includes('broken')) {
      return 'fix-bug';
    }

    if (lower.includes('add') && !lower.includes('build') && !lower.includes('create')) {
      return 'quick-feature';
    }

    return 'new-app';
  }

  routeTask(task: Task): Agent {
    return new ClaudeAgent(task.agentRole);
  }

  async *handleRequest(prompt: string, context: AgentContext): AsyncIterable<OrchestratorEvent> {
    const workflowType = this.selectWorkflow(prompt);
    const graph = this.engine.loadGraph(workflowType, {});

    yield {
      type: 'workflow-started',
      timestamp: Date.now(),
      graphStatus: this.engine.getStatus(graph),
    };

    const accumulatedResults = [...context.previousResults];

    while (true) {
      const readyTasks = this.engine.getReadyTasks(graph);

      if (readyTasks.length === 0) {
        const status = this.engine.getStatus(graph);

        if (status.isComplete) {
          break;
        }

        if (status.failed > 0) {
          yield {
            type: 'workflow-failed',
            timestamp: Date.now(),
            graphStatus: status,
          };
          return;
        }

        // No ready tasks and not complete — deadlock
        break;
      }

      // Execute ready tasks sequentially in MVP
      // (parallel execution is a future enhancement)
      for (const task of readyTasks) {
        const agent = this.routeTask(task);

        yield {
          type: 'agent-started',
          agentRole: task.agentRole,
          taskId: task.id,
          timestamp: Date.now(),
        };

        try {
          const agentContext: AgentContext = {
            ...context,
            previousResults: [...accumulatedResults],
          };

          const result = await agent.execute(task, agentContext);
          this.engine.markComplete(graph, task.id, result);
          accumulatedResults.push(result);

          yield {
            type: 'agent-completed',
            agentRole: task.agentRole,
            taskId: task.id,
            result,
            timestamp: Date.now(),
            graphStatus: this.engine.getStatus(graph),
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.engine.markFailed(graph, task.id, errorMsg);

          yield {
            type: 'agent-failed',
            agentRole: task.agentRole,
            taskId: task.id,
            content: errorMsg,
            timestamp: Date.now(),
            graphStatus: this.engine.getStatus(graph),
          };
        }
      }
    }

    yield {
      type: 'workflow-completed',
      timestamp: Date.now(),
      graphStatus: this.engine.getStatus(graph),
    };
  }
}

import { describe, it, expect } from 'vitest';
import { TaskGraphWorkflowEngine } from '../../../src/lib/orchestrator/task-graph-engine';
import type { AgentResult, TaskGraph } from '../../../src/lib/orchestrator/types';

function makeResult(role: string): AgentResult {
  return {
    role: role as any,
    content: 'done',
    artifacts: [],
    tokensIn: 100,
    tokensOut: 200,
    durationMs: 1000,
  };
}

describe('TaskGraphWorkflowEngine', () => {
  const engine = new TaskGraphWorkflowEngine();

  describe('loadGraph', () => {
    it('should load a new-app workflow template', () => {
      const graph = engine.loadGraph('new-app', { projectName: 'todo-app' });

      expect(graph.id).toBeDefined();
      expect(graph.workflowType).toBe('new-app');
      expect(graph.tasks.size).toBeGreaterThan(0);
    });

    it('should create tasks with correct agent roles', () => {
      const graph = engine.loadGraph('new-app', {});
      const tasks = Array.from(graph.tasks.values());
      const roles = tasks.map((t) => t.agentRole);

      expect(roles).toContain('product-manager');
      expect(roles).toContain('architect');
      expect(roles).toContain('backend-engineer');
      expect(roles).toContain('frontend-engineer');
      expect(roles).toContain('qa-engineer');
    });

    it('should set all tasks to pending status', () => {
      const graph = engine.loadGraph('new-app', {});
      const tasks = Array.from(graph.tasks.values());

      tasks.forEach((task) => {
        expect(task.status).toBe('pending');
      });
    });

    it('should set dependencies so PM runs first', () => {
      const graph = engine.loadGraph('new-app', {});
      const pmTask = Array.from(graph.tasks.values()).find((t) => t.agentRole === 'product-manager');

      expect(pmTask).toBeDefined();
      expect(pmTask!.dependsOn).toHaveLength(0);
    });
  });

  describe('getReadyTasks', () => {
    it('should return tasks with no dependencies initially', () => {
      const graph = engine.loadGraph('new-app', {});
      const ready = engine.getReadyTasks(graph);

      expect(ready.length).toBeGreaterThan(0);
      ready.forEach((task) => {
        expect(task.dependsOn).toHaveLength(0);
      });
    });

    it('should not return tasks with unresolved dependencies', () => {
      const graph = engine.loadGraph('new-app', {});
      const ready = engine.getReadyTasks(graph);
      const readyIds = ready.map((t) => t.id);

      // Architect depends on PM, should NOT be ready initially
      const archTask = Array.from(graph.tasks.values()).find((t) => t.agentRole === 'architect');

      if (archTask && archTask.dependsOn.length > 0) {
        expect(readyIds).not.toContain(archTask.id);
      }
    });

    it('should unlock dependent tasks when dependencies complete', () => {
      const graph = engine.loadGraph('new-app', {});

      // Complete the PM task
      const pmTask = Array.from(graph.tasks.values()).find((t) => t.agentRole === 'product-manager')!;
      engine.markComplete(graph, pmTask.id, makeResult('product-manager'));

      const ready = engine.getReadyTasks(graph);
      const readyRoles = ready.map((t) => t.agentRole);

      // Architect should now be ready
      expect(readyRoles).toContain('architect');
    });
  });

  describe('markComplete', () => {
    it('should update task status to completed', () => {
      const graph = engine.loadGraph('new-app', {});
      const pmTask = Array.from(graph.tasks.values()).find((t) => t.agentRole === 'product-manager')!;

      engine.markComplete(graph, pmTask.id, makeResult('product-manager'));

      expect(graph.tasks.get(pmTask.id)!.status).toBe('completed');
    });

    it('should store the result on the task', () => {
      const graph = engine.loadGraph('new-app', {});
      const pmTask = Array.from(graph.tasks.values()).find((t) => t.agentRole === 'product-manager')!;
      const result = makeResult('product-manager');

      engine.markComplete(graph, pmTask.id, result);

      expect(graph.tasks.get(pmTask.id)!.result).toEqual(result);
    });
  });

  describe('markFailed', () => {
    it('should update task status to failed', () => {
      const graph = engine.loadGraph('new-app', {});
      const pmTask = Array.from(graph.tasks.values()).find((t) => t.agentRole === 'product-manager')!;

      engine.markFailed(graph, pmTask.id, 'API error');

      expect(graph.tasks.get(pmTask.id)!.status).toBe('failed');
    });
  });

  describe('getStatus', () => {
    it('should report correct counts for a fresh graph', () => {
      const graph = engine.loadGraph('new-app', {});
      const status = engine.getStatus(graph);

      expect(status.total).toBe(graph.tasks.size);
      expect(status.pending).toBe(graph.tasks.size);
      expect(status.completed).toBe(0);
      expect(status.inProgress).toBe(0);
      expect(status.failed).toBe(0);
      expect(status.isComplete).toBe(false);
    });

    it('should report isComplete when all tasks are done', () => {
      const graph = engine.loadGraph('new-app', {});

      // Complete all tasks in order
      const ordered = getTopologicalOrder(graph);

      for (const taskId of ordered) {
        engine.markComplete(graph, taskId, makeResult(graph.tasks.get(taskId)!.agentRole));
      }

      const status = engine.getStatus(graph);
      expect(status.isComplete).toBe(true);
      expect(status.completed).toBe(status.total);
    });

    it('should list ready task IDs', () => {
      const graph = engine.loadGraph('new-app', {});
      const status = engine.getStatus(graph);

      expect(status.readyTasks.length).toBeGreaterThan(0);
    });
  });
});

function getTopologicalOrder(graph: TaskGraph): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function visit(taskId: string) {
    if (visited.has(taskId)) return;

    const task = graph.tasks.get(taskId)!;

    for (const dep of task.dependsOn) {
      visit(dep);
    }

    visited.add(taskId);
    result.push(taskId);
  }

  for (const taskId of graph.tasks.keys()) {
    visit(taskId);
  }

  return result;
}

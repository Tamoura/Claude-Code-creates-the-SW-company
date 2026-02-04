import type {
  WorkflowEngine,
  TaskGraph,
  Task,
  AgentResult,
  GraphStatus,
  WorkflowTemplate,
  AgentRole,
} from './types';

const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  'new-app': {
    id: 'new-app',
    name: 'Build New Application',
    description: 'Full pipeline: plan → design → build → test',
    tasks: [
      {
        id: 'plan',
        title: 'Create project plan',
        description: 'Analyze the request and create a development plan with features, tech stack, and file structure.',
        agentRole: 'product-manager',
        dependsOn: [],
        parallelOk: false,
      },
      {
        id: 'design',
        title: 'Design architecture',
        description: 'Design the system architecture, API contracts, and component structure based on the plan.',
        agentRole: 'architect',
        dependsOn: ['plan'],
        parallelOk: false,
      },
      {
        id: 'backend',
        title: 'Build backend',
        description: 'Implement the API, database schema, and server-side logic based on the architecture.',
        agentRole: 'backend-engineer',
        dependsOn: ['design'],
        parallelOk: true,
      },
      {
        id: 'frontend',
        title: 'Build frontend',
        description: 'Implement the UI components, pages, and client-side logic based on the architecture.',
        agentRole: 'frontend-engineer',
        dependsOn: ['design'],
        parallelOk: true,
      },
      {
        id: 'test',
        title: 'Run tests and QA',
        description: 'Verify the application works: run tests, check for bugs, validate the output.',
        agentRole: 'qa-engineer',
        dependsOn: ['backend', 'frontend'],
        parallelOk: false,
      },
    ],
  },
  'quick-feature': {
    id: 'quick-feature',
    name: 'Add Quick Feature',
    description: 'Single-agent implementation for small features',
    tasks: [
      {
        id: 'implement',
        title: 'Implement feature',
        description: 'Implement the requested feature directly.',
        agentRole: 'frontend-engineer',
        dependsOn: [],
        parallelOk: false,
      },
    ],
  },
  'fix-bug': {
    id: 'fix-bug',
    name: 'Fix Bug',
    description: 'Diagnose and fix a bug',
    tasks: [
      {
        id: 'diagnose',
        title: 'Diagnose the issue',
        description: 'Analyze the bug report, identify root cause.',
        agentRole: 'qa-engineer',
        dependsOn: [],
        parallelOk: false,
      },
      {
        id: 'fix',
        title: 'Fix the bug',
        description: 'Implement the fix based on the diagnosis.',
        agentRole: 'backend-engineer',
        dependsOn: ['diagnose'],
        parallelOk: false,
      },
    ],
  },
};

export class TaskGraphWorkflowEngine implements WorkflowEngine {
  loadGraph(template: string, vars: Record<string, string>): TaskGraph {
    const tmpl = WORKFLOW_TEMPLATES[template];

    if (!tmpl) {
      throw new Error(`Unknown workflow template: ${template}`);
    }

    const tasks = new Map<string, Task>();

    for (const taskDef of tmpl.tasks) {
      tasks.set(taskDef.id, {
        ...taskDef,
        status: 'pending',
        result: undefined,
      });
    }

    return {
      id: `${template}-${Date.now()}`,
      workflowType: template,
      tasks,
      createdAt: Date.now(),
    };
  }

  getReadyTasks(graph: TaskGraph): Task[] {
    const ready: Task[] = [];

    for (const task of graph.tasks.values()) {
      if (task.status !== 'pending') {
        continue;
      }

      const depsResolved = task.dependsOn.every((depId) => {
        const dep = graph.tasks.get(depId);
        return dep && dep.status === 'completed';
      });

      if (depsResolved) {
        ready.push(task);
      }
    }

    return ready;
  }

  markComplete(graph: TaskGraph, taskId: string, result: AgentResult): void {
    const task = graph.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.result = result;
  }

  markFailed(graph: TaskGraph, taskId: string, error: string): void {
    const task = graph.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'failed';
  }

  getStatus(graph: TaskGraph): GraphStatus {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let failed = 0;

    for (const task of graph.tasks.values()) {
      switch (task.status) {
        case 'pending':
          pending++;
          break;
        case 'in-progress':
          inProgress++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    const readyTasks = this.getReadyTasks(graph).map((t) => t.id);
    const total = graph.tasks.size;

    return {
      total,
      pending,
      inProgress,
      completed,
      failed,
      readyTasks,
      isComplete: completed === total,
    };
  }
}

export { WORKFLOW_TEMPLATES };

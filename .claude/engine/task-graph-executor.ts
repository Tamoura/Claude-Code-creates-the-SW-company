/**
 * Task Graph Executor
 * Automated execution engine for task graphs
 * Compatible with Claude Code system
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface Task {
  id: string;
  name: string;
  description: string;
  agent: string;
  depends_on?: string[];
  produces?: Artifact[];
  consumes?: ConsumedArtifact[];
  parallel_ok?: boolean;
  checkpoint?: boolean;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  estimated_time_minutes?: number;
  acceptance_criteria?: string[];
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  retry_count?: number;
  result?: TaskResult;
}

export interface Artifact {
  name: string;
  type: 'file' | 'directory' | 'pr' | 'branch' | 'document' | 'decision';
  path: string;
}

export interface ConsumedArtifact {
  name: string;
  required_from_task: string;
}

export interface TaskResult {
  artifacts?: Artifact[];
  metrics?: {
    time_spent_minutes?: number;
    files_changed?: number;
    tests_added?: number;
    tests_passing?: boolean;
    coverage_percent?: number;
  };
  error?: {
    message: string;
    type: string;
    retry_count: number;
  };
}

export interface TaskGraph {
  metadata: {
    product: string;
    version: string;
    created_at: string;
    updated_at: string;
  };
  tasks: Task[];
}

export interface ExecutionResult {
  success: boolean;
  completed_tasks: string[];
  failed_tasks: string[];
  blocked_tasks: string[];
  total_time_minutes: number;
  errors: string[];
}

export class TaskGraphExecutor {
  private graph: TaskGraph;
  private productPath: string;

  constructor(productPath: string) {
    this.productPath = productPath;
  }

  /**
   * Load task graph from file
   */
  async loadGraph(): Promise<void> {
    const graphPath = path.join(this.productPath, '.claude', 'task-graph.yml');
    try {
      const content = await fs.readFile(graphPath, 'utf-8');
      // Simple YAML parsing (in production, use a YAML library)
      // For now, we'll expect JSON format or use yaml parsing library
      this.graph = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load task graph: ${error}`);
    }
  }

  /**
   * Get tasks that are ready to execute (dependencies met)
   */
  getReadyTasks(): Task[] {
    return this.graph.tasks.filter(task => {
      if (task.status !== 'pending') return false;

      // Check if all dependencies are completed
      if (task.depends_on && task.depends_on.length > 0) {
        const allDepsComplete = task.depends_on.every(depId => {
          const depTask = this.graph.tasks.find(t => t.id === depId);
          return depTask?.status === 'completed';
        });
        if (!allDepsComplete) return false;
      }

      // Check if checkpoint is blocking
      if (this.isCheckpointBlocking()) return false;

      return true;
    });
  }

  /**
   * Get tasks that can run in parallel
   */
  getParallelTasks(readyTasks: Task[]): Task[][] {
    // Group by dependency set
    const groups = new Map<string, Task[]>();

    readyTasks.forEach(task => {
      const depKey = (task.depends_on || []).sort().join(',');
      if (!groups.has(depKey)) {
        groups.set(depKey, []);
      }
      groups.get(depKey)!.push(task);
    });

    // Return groups with parallel_ok tasks
    const parallelGroups: Task[][] = [];
    groups.forEach(tasks => {
      const parallelTasks = tasks.filter(t => t.parallel_ok === true);
      if (parallelTasks.length > 1) {
        parallelGroups.push(parallelTasks);
      } else {
        // Single tasks can still be parallelized if they have parallel_ok
        tasks.forEach(t => {
          if (t.parallel_ok) {
            parallelGroups.push([t]);
          }
        });
      }
    });

    return parallelGroups;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: Task['status'], result?: TaskResult): Promise<void> {
    const task = this.graph.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;

    if (status === 'in_progress') {
      task.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      task.completed_at = new Date().toISOString();
      if (result) {
        task.result = result;
      }
    }

    // Update graph metadata
    this.graph.metadata.updated_at = new Date().toISOString();

    // Save to file
    await this.saveGraph();
  }

  /**
   * Save task graph to file
   */
  async saveGraph(): Promise<void> {
    const graphPath = path.join(this.productPath, '.claude', 'task-graph.yml');
    // In production, use YAML library to write
    // For now, save as JSON (can be converted)
    const jsonPath = graphPath.replace('.yml', '.json');
    await fs.writeFile(jsonPath, JSON.stringify(this.graph, null, 2));
  }

  /**
   * Check if checkpoint is blocking execution
   */
  private isCheckpointBlocking(): boolean {
    // Check if there's a completed checkpoint task waiting for approval
    const checkpointTasks = this.graph.tasks.filter(
      t => t.checkpoint === true && t.status === 'completed'
    );
    return checkpointTasks.length > 0;
  }

  /**
   * Validate task graph
   */
  validateGraph(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) {
        return true;
      }
      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      const task = this.graph.tasks.find(t => t.id === taskId);
      if (task?.depends_on) {
        for (const depId of task.depends_on) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    this.graph.tasks.forEach(task => {
      if (hasCycle(task.id)) {
        errors.push(`Circular dependency detected involving task ${task.id}`);
      }

      // Check that all dependencies exist
      if (task.depends_on) {
        task.depends_on.forEach(depId => {
          if (!this.graph.tasks.find(t => t.id === depId)) {
            errors.push(`Task ${task.id} depends on non-existent task ${depId}`);
          }
        });
      }

      // Check consumed artifacts
      if (task.consumes) {
        task.consumes.forEach(artifact => {
          const producerTask = this.graph.tasks.find(t => t.id === artifact.required_from_task);
          if (!producerTask) {
            errors.push(`Task ${task.id} consumes artifact from non-existent task ${artifact.required_from_task}`);
          } else if (producerTask.produces) {
            const artifactExists = producerTask.produces.some(a => a.name === artifact.name);
            if (!artifactExists) {
              errors.push(`Task ${task.id} consumes artifact ${artifact.name} that is not produced by ${artifact.required_from_task}`);
            }
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate critical path (longest dependency chain)
   */
  calculateCriticalPath(): { path: string[]; total_time_minutes: number } {
    const longestPath: string[] = [];
    let maxTime = 0;

    const calculatePath = (taskId: string, currentPath: string[], currentTime: number): void => {
      const task = this.graph.tasks.find(t => t.id === taskId);
      if (!task) return;

      const newPath = [...currentPath, taskId];
      const newTime = currentTime + (task.estimated_time_minutes || 0);

      // Check if this is a terminal task (no one depends on it)
      const hasDependents = this.graph.tasks.some(t => t.depends_on?.includes(taskId));
      if (!hasDependents) {
        if (newTime > maxTime) {
          maxTime = newTime;
          longestPath.length = 0;
          longestPath.push(...newPath);
        }
      } else {
        // Continue with dependents
        this.graph.tasks
          .filter(t => t.depends_on?.includes(taskId))
          .forEach(dependent => {
            calculatePath(dependent.id, newPath, newTime);
          });
      }
    };

    // Start from tasks with no dependencies
    this.graph.tasks
      .filter(t => !t.depends_on || t.depends_on.length === 0)
      .forEach(rootTask => {
        calculatePath(rootTask.id, [], 0);
      });

    return {
      path: longestPath,
      total_time_minutes: maxTime
    };
  }

  /**
   * Execute task graph (main execution loop)
   */
  async execute(): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: false,
      completed_tasks: [],
      failed_tasks: [],
      blocked_tasks: [],
      total_time_minutes: 0,
      errors: []
    };

    // Validate graph first
    const validation = this.validateGraph();
    if (!validation.valid) {
      result.errors = validation.errors;
      return result;
    }

    const startTime = Date.now();

    // Main execution loop
    while (true) {
      const readyTasks = this.getReadyTasks();

      if (readyTasks.length === 0) {
        // Check if we're done or blocked
        const pendingTasks = this.graph.tasks.filter(t => t.status === 'pending');
        const inProgressTasks = this.graph.tasks.filter(t => t.status === 'in_progress');

        if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
          // All tasks complete
          result.success = true;
          break;
        }

        // Check for blocked tasks
        const blocked = this.graph.tasks.filter(t => t.status === 'blocked');
        if (blocked.length > 0) {
          result.blocked_tasks = blocked.map(t => t.id);
          result.errors.push(`Execution blocked by: ${blocked.map(t => t.id).join(', ')}`);
          break;
        }

        // Wait for in-progress tasks (in real implementation, this would wait for agent responses)
        break;
      }

      // Get parallel groups
      const parallelGroups = this.getParallelTasks(readyTasks);

      // Execute parallel groups
      for (const group of parallelGroups) {
        // In real implementation, invoke agents here
        // For now, mark as in_progress
        for (const task of group) {
          await this.updateTaskStatus(task.id, 'in_progress');
        }
      }

      // Also handle sequential tasks
      const sequentialTasks = readyTasks.filter(t => !t.parallel_ok);
      for (const task of sequentialTasks) {
        await this.updateTaskStatus(task.id, 'in_progress');
      }
    }

    result.total_time_minutes = Math.round((Date.now() - startTime) / 60000);
    result.completed_tasks = this.graph.tasks
      .filter(t => t.status === 'completed')
      .map(t => t.id);
    result.failed_tasks = this.graph.tasks
      .filter(t => t.status === 'failed')
      .map(t => t.id);

    return result;
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const productPath = process.argv[2];
  if (!productPath) {
    console.error('Usage: npx tsx task-graph-executor.ts <product-path>');
    process.exit(1);
  }

  const executor = new TaskGraphExecutor(productPath);
  executor.loadGraph()
    .then(() => executor.execute())
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

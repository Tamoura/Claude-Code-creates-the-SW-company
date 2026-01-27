/**
 * Agent Message Router
 * Validates, routes, and stores agent messages
 * Compatible with Claude Code system
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentMessage {
  metadata: {
    from: string;
    to: string;
    timestamp: string;
    message_type: 'task_complete' | 'task_failed' | 'needs_input' | 'needs_decision' | 'error' | 'checkpoint_ready' | 'handoff' | 'status_update';
    product?: string;
    task_id?: string;
  };
  payload: {
    status: 'success' | 'failure' | 'blocked' | 'in_progress' | 'needs_review';
    summary: string;
    artifacts?: Array<{
      path: string;
      type: 'file' | 'pr' | 'branch' | 'url' | 'document';
      description: string;
    }>;
    context?: {
      decisions_made?: string[];
      assumptions?: string[];
      risks?: string[];
      notes?: string[];
    };
    blockers?: Array<{
      description: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      requires: 'ceo_decision' | 'other_agent' | 'external' | 'investigation';
    }>;
    metrics?: {
      time_spent_minutes?: number;
      files_changed?: number;
      tests_added?: number;
      tests_passing?: boolean;
      coverage_percent?: number;
    };
  };
  handoff?: {
    next_agent?: string;
    required_context?: string[];
    suggested_task?: string;
  };
  error_details?: {
    error_type?: 'test_failure' | 'build_failure' | 'dependency_issue' | 'logic_error' | 'configuration_error' | 'external_service_error';
    error_message?: string;
    stack_trace?: string;
    attempted_solutions?: string[];
    retry_count?: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class AgentMessageRouter {
  private messagesDir: string;

  constructor(repoRoot: string = process.cwd()) {
    this.messagesDir = path.join(repoRoot, '.claude', 'messages');
  }

  /**
   * Validate agent message against schema
   */
  validate(message: AgentMessage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required metadata fields
    if (!message.metadata) {
      errors.push('Missing metadata section');
      return { valid: false, errors, warnings };
    }

    if (!message.metadata.from) {
      errors.push('Missing metadata.from');
    }

    if (!message.metadata.to) {
      errors.push('Missing metadata.to');
    }

    if (!message.metadata.timestamp) {
      errors.push('Missing metadata.timestamp');
    } else {
      // Validate ISO-8601 format
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(message.metadata.timestamp)) {
        errors.push('Invalid timestamp format (expected ISO-8601)');
      }
    }

    if (!message.metadata.message_type) {
      errors.push('Missing metadata.message_type');
    }

    // Required payload fields
    if (!message.payload) {
      errors.push('Missing payload section');
      return { valid: false, errors, warnings };
    }

    if (!message.payload.status) {
      errors.push('Missing payload.status');
    }

    if (!message.payload.summary) {
      errors.push('Missing payload.summary');
    }

    // Validate artifacts if present
    if (message.payload.artifacts) {
      message.payload.artifacts.forEach((artifact, index) => {
        if (!artifact.path) {
          errors.push(`Artifact ${index}: missing path`);
        }
        if (!artifact.type) {
          errors.push(`Artifact ${index}: missing type`);
        }
      });
    }

    // Warnings for common issues
    if (message.payload.status === 'success' && !message.payload.artifacts) {
      warnings.push('Success status but no artifacts reported');
    }

    if (message.payload.status === 'failure' && !message.error_details) {
      warnings.push('Failure status but no error_details provided');
    }

    if (message.metadata.message_type === 'handoff' && !message.handoff) {
      warnings.push('Handoff message type but no handoff section');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Store message to file system
   */
  async store(message: AgentMessage): Promise<string> {
    // Ensure messages directory exists
    await fs.mkdir(this.messagesDir, { recursive: true });

    // Create filename from metadata
    const timestamp = message.metadata.timestamp.replace(/[:.]/g, '-');
    const filename = `${timestamp}-${message.metadata.from}-${message.metadata.message_type}.json`;
    const filepath = path.join(this.messagesDir, filename);

    // Store message
    await fs.writeFile(filepath, JSON.stringify(message, null, 2));

    return filepath;
  }

  /**
   * Route message to appropriate handler
   */
  async route(message: AgentMessage): Promise<void> {
    const validation = this.validate(message);
    if (!validation.valid) {
      throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
    }

    // Store message
    await this.store(message);

    // Route based on message type and recipient
    if (message.metadata.to === 'orchestrator') {
      await this.handleOrchestratorMessage(message);
    } else {
      await this.handleAgentMessage(message);
    }
  }

  /**
   * Handle message for orchestrator
   */
  private async handleOrchestratorMessage(message: AgentMessage): Promise<void> {
    // Update task graph if task_id is present
    if (message.metadata.task_id && message.metadata.product) {
      await this.updateTaskGraph(message);
    }

    // Update agent memory
    await this.updateAgentMemory(message);

    // Handle checkpoints
    if (message.metadata.message_type === 'checkpoint_ready') {
      await this.createCheckpoint(message);
    }

    // Handle blockers
    if (message.payload.blockers && message.payload.blockers.length > 0) {
      await this.handleBlockers(message);
    }
  }

  /**
   * Handle message for other agents
   */
  private async handleAgentMessage(message: AgentMessage): Promise<void> {
    // Store for agent to read
    const agentMessagesDir = path.join(this.messagesDir, message.metadata.to);
    await fs.mkdir(agentMessagesDir, { recursive: true });
    
    const filename = `${message.metadata.timestamp.replace(/[:.]/g, '-')}-${message.metadata.from}.json`;
    await fs.writeFile(
      path.join(agentMessagesDir, filename),
      JSON.stringify(message, null, 2)
    );
  }

  /**
   * Update task graph based on message
   */
  private async updateTaskGraph(message: AgentMessage): Promise<void> {
    if (!message.metadata.product || !message.metadata.task_id) return;

    const productPath = path.join(process.cwd(), 'products', message.metadata.product);
    const graphPath = path.join(productPath, '.claude', 'task-graph.json');

    try {
      const graphContent = await fs.readFile(graphPath, 'utf-8');
      const graph = JSON.parse(graphContent);

      const task = graph.tasks.find((t: any) => t.id === message.metadata.task_id);
      if (task) {
        if (message.payload.status === 'success') {
          task.status = 'completed';
          task.completed_at = message.metadata.timestamp;
          if (message.payload.artifacts) {
            task.result = { artifacts: message.payload.artifacts };
          }
        } else if (message.payload.status === 'failure') {
          task.status = 'failed';
          task.completed_at = message.metadata.timestamp;
          task.retry_count = (task.retry_count || 0) + 1;
        }

        graph.metadata.updated_at = new Date().toISOString();
        await fs.writeFile(graphPath, JSON.stringify(graph, null, 2));
      }
    } catch (error) {
      // Task graph might not exist yet, that's okay
      console.warn(`Could not update task graph: ${error}`);
    }
  }

  /**
   * Update agent memory based on message
   */
  private async updateAgentMemory(message: AgentMessage): Promise<void> {
    const agentName = message.metadata.from;
    const memoryPath = path.join(
      process.cwd(),
      '.claude',
      'memory',
      'agent-experiences',
      `${agentName}.json`
    );

    try {
      const memoryContent = await fs.readFile(memoryPath, 'utf-8');
      const memory = JSON.parse(memoryContent);

      // Add to task history
      if (!memory.task_history) {
        memory.task_history = [];
      }

      memory.task_history.push({
        task_id: message.metadata.task_id,
        product: message.metadata.product,
        started_at: message.metadata.timestamp,
        completed_at: message.metadata.timestamp,
        status: message.payload.status,
        metrics: message.payload.metrics,
        artifacts: message.payload.artifacts
      });

      // Update performance metrics
      if (!memory.performance_metrics) {
        memory.performance_metrics = {
          tasks_completed: 0,
          success_rate: 0,
          average_time_minutes: 0
        };
      }

      const completedTasks = memory.task_history.filter((t: any) => 
        t.status === 'success' || t.status === 'failure'
      );
      memory.performance_metrics.tasks_completed = completedTasks.length;
      memory.performance_metrics.success_rate = 
        completedTasks.filter((t: any) => t.status === 'success').length / completedTasks.length;

      await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
    } catch (error) {
      // Memory file might not exist yet, create it
      const newMemory = {
        agent: agentName,
        task_history: [{
          task_id: message.metadata.task_id,
          product: message.metadata.product,
          status: message.payload.status,
          metrics: message.payload.metrics
        }],
        performance_metrics: {
          tasks_completed: 1,
          success_rate: message.payload.status === 'success' ? 1 : 0
        }
      };

      await fs.mkdir(path.dirname(memoryPath), { recursive: true });
      await fs.writeFile(memoryPath, JSON.stringify(newMemory, null, 2));
    }
  }

  /**
   * Create checkpoint file
   */
  private async createCheckpoint(message: AgentMessage): Promise<void> {
    const checkpointPath = path.join(
      process.cwd(),
      '.claude',
      'checkpoints',
      `${message.metadata.timestamp.replace(/[:.]/g, '-')}-${message.metadata.product}.json`
    );

    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify(message, null, 2));
  }

  /**
   * Handle blockers
   */
  private async handleBlockers(message: AgentMessage): Promise<void> {
    const blockersPath = path.join(
      process.cwd(),
      '.claude',
      'blockers',
      `${message.metadata.timestamp.replace(/[:.]/g, '-')}-${message.metadata.product}.json`
    );

    await fs.mkdir(path.dirname(blockersPath), { recursive: true });
    await fs.writeFile(blockersPath, JSON.stringify(message.payload.blockers, null, 2));
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const messageJson = process.argv[2];
  if (!messageJson) {
    console.error('Usage: npx tsx message-router.ts <message-json>');
    process.exit(1);
  }

  try {
    const message: AgentMessage = JSON.parse(messageJson);
    const router = new AgentMessageRouter();
    
    const validation = router.validate(message);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      console.warn('Warnings:', validation.warnings);
    }

    await router.route(message);
    console.log('Message routed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

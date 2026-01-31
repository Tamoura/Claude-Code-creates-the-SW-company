/**
 * Risk Calculator for Smart Checkpointing
 * Compatible with Claude Code system - can be used by orchestrator agent
 * 
 * Usage:
 *   import { calculateTaskRisk } from './risk-calculator';
 *   const result = calculateTaskRisk(task, context);
 */

export interface Task {
  id: string;
  affects_production?: boolean;
  affects_staging?: boolean;
  affects_dev?: boolean;
  estimated_files_changed?: number;
  adds_external_dependencies?: boolean;
  updates_dependencies?: boolean;
  affects_database_schema?: boolean;
  affects_data_model?: boolean;
  assigned_agent?: string;
  uses_new_pattern?: boolean;
  uses_pattern_with_confidence?: number;
}

export interface Agent {
  recent_failures?: number;
  success_rate?: number;
}

export interface Context {
  agents?: Record<string, Agent>;
}

export interface RiskResult {
  score: number;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  action: 'auto_approve' | 'auto_approve_with_notification' | 'optional_review' | 'ceo_approval_required' | 'ceo_approval_required_with_details';
  requiresApproval: boolean;
}

export class RiskCalculator {
  /**
   * Calculate risk score from 0.0 (no risk) to 1.0 (maximum risk)
   */
  calculateRisk(task: Task, context: Context = {}): number {
    let score = 0.0;

    // 1. Task Impact (0-0.3)
    if (task.affects_production) {
      score += 0.3;
    } else if (task.affects_staging) {
      score += 0.15;
    } else if (task.affects_dev) {
      score += 0.05;
    }

    // 2. Code Complexity (0-0.2)
    const filesChanged = task.estimated_files_changed || 0;
    if (filesChanged > 20) {
      score += 0.2;
    } else if (filesChanged > 10) {
      score += 0.15;
    } else if (filesChanged > 5) {
      score += 0.1;
    } else {
      score += 0.02;
    }

    // 3. External Dependencies (0-0.15)
    if (task.adds_external_dependencies) {
      score += 0.15;
    } else if (task.updates_dependencies) {
      score += 0.08;
    }

    // 4. Data Impact (0-0.15)
    if (task.affects_database_schema) {
      score += 0.15;
    } else if (task.affects_data_model) {
      score += 0.08;
    }

    // 5. Agent History (0-0.1)
    if (task.assigned_agent && context.agents) {
      const agent = context.agents[task.assigned_agent];
      if (agent) {
        if ((agent.recent_failures || 0) > 2) {
          score += 0.1;
        } else if ((agent.success_rate || 1.0) < 0.85) {
          score += 0.05;
        }
      }
    }

    // 6. Pattern Confidence (0-0.1)
    if (task.uses_new_pattern) {
      score += 0.1;
    } else if (task.uses_pattern_with_confidence !== undefined) {
      if (task.uses_pattern_with_confidence < 0.7) {
        score += 0.05;
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  shouldRequireApproval(score: number): boolean {
    return score >= 0.6;
  }

  getRiskLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (score < 0.3) return 'very_low';
    if (score < 0.5) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'very_high';
  }

  getAction(score: number): RiskResult['action'] {
    const level = this.getRiskLevel(score);
    const actions: Record<string, RiskResult['action']> = {
      very_low: 'auto_approve',
      low: 'auto_approve_with_notification',
      medium: 'optional_review',
      high: 'ceo_approval_required',
      very_high: 'ceo_approval_required_with_details'
    };
    return actions[level] || 'unknown';
  }
}

/**
 * Calculate risk for a task
 * 
 * @param task - Task to evaluate
 * @param context - Optional context with agent information
 * @returns Risk assessment result
 */
export function calculateTaskRisk(task: Task, context?: Context): RiskResult {
  const calculator = new RiskCalculator();
  const score = calculator.calculateRisk(task, context);
  
  return {
    score,
    level: calculator.getRiskLevel(score),
    action: calculator.getAction(score),
    requiresApproval: calculator.shouldRequireApproval(score)
  };
}

/**
 * CLI interface for use in scripts
 * Usage: npx tsx .claude/checkpointing/risk-calculator.ts <task-json>
 */
function main() {
  const taskJson = process.argv[2];
  if (!taskJson) {
    console.error('Usage: npx tsx risk-calculator.ts <task-json>');
    process.exit(1);
  }

  try {
    const task: Task = JSON.parse(taskJson);
    const result = calculateTaskRisk(task);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error parsing task JSON:', error);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1]?.includes('risk-calculator');
if (isDirectRun) {
  main();
}

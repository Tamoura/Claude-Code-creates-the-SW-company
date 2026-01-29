/**
 * Agent Health Monitor
 * Monitor agent performance and detect anomalies
 * Compatible with Claude Code system
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentHealthStatus {
  agent: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    success_rate: number;
    average_time_minutes: number;
    recent_failures: number;
    tasks_completed: number;
  };
  trends: {
    success_rate_trend: 'improving' | 'declining' | 'stable';
    time_trend: 'faster' | 'slower' | 'stable';
  };
  anomalies: string[];
  suggestions: string[];
}

export interface Anomaly {
  agent: string;
  type: 'low_success_rate' | 'high_failure_rate' | 'slow_performance' | 'inconsistent_timing';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected_at: string;
}

export class AgentHealthMonitor {
  private memoryDir: string;
  private healthDir: string;

  constructor(repoRoot: string = process.cwd()) {
    this.memoryDir = path.join(repoRoot, '.claude', 'memory', 'agent-experiences');
    this.healthDir = path.join(repoRoot, '.claude', 'monitoring', 'health');
  }

  /**
   * Check health of a specific agent
   */
  async checkAgentHealth(agent: string): Promise<AgentHealthStatus> {
    const memoryPath = path.join(this.memoryDir, `${agent}.json`);

    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      const memory = JSON.parse(content);

      const taskHistory = memory.task_history || [];
      const performanceMetrics = memory.performance_metrics || {};

      // Calculate metrics
      const completedTasks = taskHistory.filter((t: any) => 
        t.status === 'success' || t.status === 'failure'
      );

      const successCount = completedTasks.filter((t: any) => t.status === 'success').length;
      const successRate = completedTasks.length > 0 
        ? successCount / completedTasks.length 
        : 1.0;

      const recentTasks = completedTasks.slice(-10);
      const recentFailures = recentTasks.filter((t: any) => t.status === 'failure').length;

      const times = completedTasks
        .map((t: any) => {
          if (t.metrics?.time_spent_minutes) return t.metrics.time_spent_minutes;
          if (t.started_at && t.completed_at) {
            const start = new Date(t.started_at).getTime();
            const end = new Date(t.completed_at).getTime();
            return (end - start) / 60000;
          }
          return null;
        })
        .filter((t: number | null) => t !== null) as number[];

      const averageTime = times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;

      // Calculate trends
      const recentSuccessRate = recentTasks.length > 0
        ? recentTasks.filter((t: any) => t.status === 'success').length / recentTasks.length
        : successRate;

      const successRateTrend = recentSuccessRate > successRate * 1.05 
        ? 'improving' 
        : recentSuccessRate < successRate * 0.95 
        ? 'declining' 
        : 'stable';

      const recentTimes = recentTasks
        .map((t: any) => {
          if (t.metrics?.time_spent_minutes) return t.metrics.time_spent_minutes;
          return null;
        })
        .filter((t: number | null) => t !== null) as number[];

      const recentAverageTime = recentTimes.length > 0
        ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length
        : averageTime;

      const timeTrend = recentAverageTime < averageTime * 0.9
        ? 'faster'
        : recentAverageTime > averageTime * 1.1
        ? 'slower'
        : 'stable';

      // Detect anomalies
      const anomalies: string[] = [];
      const suggestions: string[] = [];

      if (successRate < 0.8) {
        anomalies.push(`Low success rate: ${(successRate * 100).toFixed(0)}%`);
        suggestions.push('Review recent failures and identify common patterns');
      }

      if (recentFailures > 3) {
        anomalies.push(`High recent failure rate: ${recentFailures} failures in last 10 tasks`);
        suggestions.push('Investigate root causes of recent failures');
      }

      if (averageTime > 180) {
        anomalies.push(`Slow average task time: ${averageTime.toFixed(0)} minutes`);
        suggestions.push('Consider breaking down tasks into smaller units');
      }

      if (successRateTrend === 'declining') {
        anomalies.push('Success rate is declining');
        suggestions.push('Review recent changes or patterns that may have caused decline');
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (successRate < 0.7 || recentFailures > 5) {
        status = 'critical';
      } else if (successRate < 0.85 || anomalies.length > 0) {
        status = 'warning';
      }

      return {
        agent,
        status,
        metrics: {
          success_rate: successRate,
          average_time_minutes: averageTime,
          recent_failures: recentFailures,
          tasks_completed: completedTasks.length
        },
        trends: {
          success_rate_trend: successRateTrend,
          time_trend: timeTrend
        },
        anomalies,
        suggestions
      };
    } catch (error) {
      // Agent memory doesn't exist yet
      return {
        agent,
        status: 'healthy',
        metrics: {
          success_rate: 1.0,
          average_time_minutes: 0,
          recent_failures: 0,
          tasks_completed: 0
        },
        trends: {
          success_rate_trend: 'stable',
          time_trend: 'stable'
        },
        anomalies: [],
        suggestions: []
      };
    }
  }

  /**
   * Detect anomalies across all agents
   */
  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      const files = await fs.readdir(this.memoryDir);
      const agentFiles = files.filter(f => f.endsWith('.json'));

      for (const file of agentFiles) {
        const agent = file.replace('.json', '');
        const health = await this.checkAgentHealth(agent);

        health.anomalies.forEach(anomalyDesc => {
          let type: Anomaly['type'] = 'low_success_rate';
          let severity: Anomaly['severity'] = 'medium';

          if (anomalyDesc.includes('Low success rate')) {
            type = 'low_success_rate';
            severity = health.metrics.success_rate < 0.7 ? 'high' : 'medium';
          } else if (anomalyDesc.includes('High recent failure')) {
            type = 'high_failure_rate';
            severity = health.metrics.recent_failures > 5 ? 'high' : 'medium';
          } else if (anomalyDesc.includes('Slow average')) {
            type = 'slow_performance';
            severity = 'low';
          } else if (anomalyDesc.includes('declining')) {
            type = 'inconsistent_timing';
            severity = 'medium';
          }

          anomalies.push({
            agent,
            type,
            severity,
            description: anomalyDesc,
            detected_at: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      console.warn('Could not detect anomalies:', error);
    }

    // Save anomalies
    await fs.mkdir(this.healthDir, { recursive: true });
    const anomaliesPath = path.join(this.healthDir, 'anomalies.json');
    await fs.writeFile(anomaliesPath, JSON.stringify(anomalies, null, 2));

    return anomalies;
  }

  /**
   * Suggest improvements for an agent
   */
  async suggestImprovements(agent: string): Promise<string[]> {
    const health = await this.checkAgentHealth(agent);
    return health.suggestions;
  }

  /**
   * Get health status for all agents
   */
  async getAllAgentHealth(): Promise<AgentHealthStatus[]> {
    try {
      const files = await fs.readdir(this.memoryDir);
      const agentFiles = files.filter(f => f.endsWith('.json'));

      const healthStatuses: AgentHealthStatus[] = [];
      for (const file of agentFiles) {
        const agent = file.replace('.json', '');
        const health = await this.checkAgentHealth(agent);
        healthStatuses.push(health);
      }

      return healthStatuses;
    } catch (error) {
      return [];
    }
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const command = process.argv[2];
  const monitor = new AgentHealthMonitor();

  switch (command) {
    case 'check':
      const agent = process.argv[3];
      if (!agent) {
        console.error('Usage: check <agent-name>');
        process.exit(1);
      }
      monitor.checkAgentHealth(agent)
        .then(health => console.log(JSON.stringify(health, null, 2)))
        .catch(console.error);
      break;

    case 'anomalies':
      monitor.detectAnomalies()
        .then(anomalies => {
          console.log(JSON.stringify(anomalies, null, 2));
          if (anomalies.length > 0) {
            process.exit(1);
          }
        })
        .catch(console.error);
      break;

    case 'all':
      monitor.getAllAgentHealth()
        .then(healths => console.log(JSON.stringify(healths, null, 2)))
        .catch(console.error);
      break;

    default:
      console.error('Usage:');
      console.error('  check <agent-name>');
      console.error('  anomalies');
      console.error('  all');
      process.exit(1);
  }
}

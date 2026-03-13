/**
 * Cost Tracker
 * Comprehensive cost tracking and budgeting system
 * Compatible with Claude Code system
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface CostEntry {
  timestamp: string;
  agent?: string;
  product?: string;
  task_id?: string;
  cost_type: 'tokens' | 'api_call' | 'infrastructure' | 'other';
  amount: number;
  currency?: string;
  provider?: string;
  description?: string;
}

export interface DailyBudget {
  date: string;
  budget_limit: number;
  spent: number;
  remaining: number;
  alerts: string[];
}

export interface CostMetrics {
  daily_cost: number;
  weekly_cost: number;
  monthly_cost: number;
  by_agent: Record<string, number>;
  by_product: Record<string, number>;
  by_cost_type: Record<string, number>;
  trends: {
    daily_average: number;
    weekly_average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export class CostTracker {
  private costsDir: string;
  private metricsPath: string;
  private budgetPath: string;

  constructor(repoRoot: string = process.cwd()) {
    this.costsDir = path.join(repoRoot, '.claude', 'memory', 'metrics', 'costs');
    this.metricsPath = path.join(repoRoot, '.claude', 'memory', 'metrics', 'cost-metrics.json');
    this.budgetPath = path.join(repoRoot, '.claude', 'resource-management', 'budget.json');
  }

  /**
   * Track token usage
   */
  async trackTokenUsage(agent: string, tokens: number, product?: string, taskId?: string): Promise<void> {
    // Estimate cost (rough calculation: $0.002 per 1K tokens for GPT-4)
    const costPer1K = 0.002;
    const cost = (tokens / 1000) * costPer1K;

    await this.trackCost({
      timestamp: new Date().toISOString(),
      agent,
      product,
      task_id: taskId,
      cost_type: 'tokens',
      amount: cost,
      currency: 'USD',
      provider: 'openai',
      description: `${tokens} tokens used`
    });
  }

  /**
   * Track API call cost
   */
  async trackAPICall(provider: string, cost: number, agent?: string, product?: string): Promise<void> {
    await this.trackCost({
      timestamp: new Date().toISOString(),
      agent,
      product,
      cost_type: 'api_call',
      amount: cost,
      currency: 'USD',
      provider,
      description: `API call to ${provider}`
    });
  }

  /**
   * Track infrastructure cost
   */
  async trackInfrastructureCost(cost: number, product: string, description?: string): Promise<void> {
    await this.trackCost({
      timestamp: new Date().toISOString(),
      product,
      cost_type: 'infrastructure',
      amount: cost,
      currency: 'USD',
      description: description || 'Infrastructure cost'
    });
  }

  /**
   * Track a cost entry
   */
  async trackCost(entry: CostEntry): Promise<void> {
    // Ensure costs directory exists
    await fs.mkdir(this.costsDir, { recursive: true });

    // Save individual cost entry
    const filename = `${entry.timestamp.replace(/[:.]/g, '-')}-${entry.cost_type}.json`;
    const filepath = path.join(this.costsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(entry, null, 2));

    // Update metrics
    await this.updateMetrics();
  }

  /**
   * Update cost metrics
   */
  private async updateMetrics(): Promise<void> {
    // Read all cost entries
    const entries = await this.getAllCostEntries();

    // Calculate metrics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyCost = entries
      .filter(e => new Date(e.timestamp) >= today)
      .reduce((sum, e) => sum + e.amount, 0);

    const weeklyCost = entries
      .filter(e => new Date(e.timestamp) >= weekAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyCost = entries
      .filter(e => new Date(e.timestamp) >= monthAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    // Group by agent
    const byAgent: Record<string, number> = {};
    entries.forEach(e => {
      if (e.agent) {
        byAgent[e.agent] = (byAgent[e.agent] || 0) + e.amount;
      }
    });

    // Group by product
    const byProduct: Record<string, number> = {};
    entries.forEach(e => {
      if (e.product) {
        byProduct[e.product] = (byProduct[e.product] || 0) + e.amount;
      }
    });

    // Group by cost type
    const byCostType: Record<string, number> = {};
    entries.forEach(e => {
      byCostType[e.cost_type] = (byCostType[e.cost_type] || 0) + e.amount;
    });

    // Calculate trends
    const dailyEntries = entries.filter(e => new Date(e.timestamp) >= weekAgo);
    const dailyAverages = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const dayCost = dailyEntries
        .filter(e => {
          const eDate = new Date(e.timestamp);
          return eDate >= day && eDate < nextDay;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      dailyAverages.push(dayCost);
    }

    const dailyAverage = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;
    const weeklyAverage = weeklyCost / 7;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (dailyAverages.length >= 2) {
      const recent = dailyAverages.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = dailyAverages.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
      if (recent > older * 1.1) trend = 'increasing';
      else if (recent < older * 0.9) trend = 'decreasing';
    }

    const metrics: CostMetrics = {
      daily_cost: dailyCost,
      weekly_cost: weeklyCost,
      monthly_cost: monthlyCost,
      by_agent: byAgent,
      by_product: byProduct,
      by_cost_type: byCostType,
      trends: {
        daily_average: dailyAverage,
        weekly_average: weeklyAverage,
        trend
      }
    };

    // Save metrics
    await fs.mkdir(path.dirname(this.metricsPath), { recursive: true });
    await fs.writeFile(this.metricsPath, JSON.stringify(metrics, null, 2));
  }

  /**
   * Get all cost entries
   */
  private async getAllCostEntries(): Promise<CostEntry[]> {
    try {
      const files = await fs.readdir(this.costsDir);
      const entries: CostEntry[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.costsDir, file), 'utf-8');
          entries.push(JSON.parse(content));
        }
      }

      return entries.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Get daily budget status
   */
  async getDailyBudget(): Promise<DailyBudget> {
    const today = new Date().toISOString().split('T')[0];

    // Read budget config
    let budgetLimit = 100; // Default
    try {
      const budgetContent = await fs.readFile(this.budgetPath, 'utf-8');
      const budget = JSON.parse(budgetContent);
      budgetLimit = budget.daily_limit || 100;
    } catch (error) {
      // Use default
    }

    // Get today's costs
    const entries = await this.getAllCostEntries();
    const todayEntries = entries.filter(e => 
      e.timestamp.startsWith(today)
    );
    const spent = todayEntries.reduce((sum, e) => sum + e.amount, 0);

    const remaining = budgetLimit - spent;
    const alerts: string[] = [];

    if (spent >= budgetLimit * 0.9) {
      alerts.push('Approaching daily budget limit (90%+)');
    }
    if (spent >= budgetLimit) {
      alerts.push('Daily budget limit exceeded');
    }

    return {
      date: today,
      budget_limit: budgetLimit,
      spent,
      remaining,
      alerts
    };
  }

  /**
   * Check budget and return alert if needed
   */
  async checkBudgetAlert(): Promise<string | null> {
    const budget = await this.getDailyBudget();
    
    if (budget.spent >= budget.budget_limit * 0.9) {
      return `Budget alert: ${budget.spent.toFixed(2)}/${budget.budget_limit} (${((budget.spent / budget.budget_limit) * 100).toFixed(0)}%)`;
    }

    return null;
  }

  /**
   * Get cost metrics
   */
  async getMetrics(): Promise<CostMetrics> {
    try {
      const content = await fs.readFile(this.metricsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return empty metrics
      return {
        daily_cost: 0,
        weekly_cost: 0,
        monthly_cost: 0,
        by_agent: {},
        by_product: {},
        by_cost_type: {},
        trends: {
          daily_average: 0,
          weekly_average: 0,
          trend: 'stable'
        }
      };
    }
  }

  /**
   * Forecast costs
   */
  async forecastCosts(days: number = 7): Promise<number> {
    const metrics = await this.getMetrics();
    const dailyAverage = metrics.trends.daily_average;
    return dailyAverage * days;
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const command = process.argv[2];
  const tracker = new CostTracker();

  switch (command) {
    case 'track-tokens':
      const agent = process.argv[3];
      const tokens = parseInt(process.argv[4]);
      tracker.trackTokenUsage(agent, tokens)
        .then(() => console.log('Token usage tracked'))
        .catch(console.error);
      break;

    case 'budget':
      tracker.getDailyBudget()
        .then(budget => console.log(JSON.stringify(budget, null, 2)))
        .catch(console.error);
      break;

    case 'metrics':
      tracker.getMetrics()
        .then(metrics => console.log(JSON.stringify(metrics, null, 2)))
        .catch(console.error);
      break;

    case 'forecast':
      const days = parseInt(process.argv[3]) || 7;
      tracker.forecastCosts(days)
        .then(forecast => console.log(`Forecasted cost for ${days} days: $${forecast.toFixed(2)}`))
        .catch(console.error);
      break;

    default:
      console.error('Usage:');
      console.error('  track-tokens <agent> <tokens>');
      console.error('  budget');
      console.error('  metrics');
      console.error('  forecast [days]');
      process.exit(1);
  }
}

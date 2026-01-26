/**
 * Dashboard API Server
 * Simple Express server for dashboard data
 * Compatible with Claude Code system
 */

import express from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

app.use(express.json());

const repoRoot = process.cwd();
const metricsDir = path.join(repoRoot, '.claude', 'memory', 'metrics');
const stateFile = path.join(repoRoot, '.claude', 'orchestrator', 'state.yml');

// Helper to read JSON files
async function readJSON(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Helper to read YAML (simple extraction)
async function readYAMLValue(filePath: string, key: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : '';
  } catch (error) {
    return '';
  }
}

// Executive summary endpoint
app.get('/api/dashboard/executive', async (req, res) => {
  try {
    const [
      agentPerformance,
      costMetrics,
      gateMetrics,
      resourceMetrics
    ] = await Promise.all([
      readJSON(path.join(metricsDir, 'agent-performance.json')),
      readJSON(path.join(metricsDir, 'cost-metrics.json')),
      readJSON(path.join(metricsDir, 'gate-metrics.json')),
      readJSON(path.join(metricsDir, 'resource-metrics.json'))
    ]);

    // Calculate summary metrics
    let totalTasks = 0;
    let successTasks = 0;

    if (agentPerformance?.agents) {
      Object.values(agentPerformance.agents).forEach((agent: any) => {
        const tasks = agent.tasks_completed || 0;
        const successRate = agent.success_rate || 0;
        totalTasks += tasks;
        successTasks += tasks * successRate;
      });
    }

    const successRate = totalTasks > 0 ? (successTasks / totalTasks) * 100 : 0;

    // Get products from state
    const products: string[] = [];
    if (await fs.access(stateFile).then(() => true).catch(() => false)) {
      const stateContent = await fs.readFile(stateFile, 'utf-8');
      const productMatches = stateContent.matchAll(/^\s+([a-z-]+):/gm);
      for (const match of productMatches) {
        products.push(match[1]);
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      active_work: {
        agents_working: 0, // TODO: Track active agents
        tasks_in_queue: 0,
        products_in_dev: products.length
      },
      today_activity: {
        tasks_completed: totalTasks,
        success_rate: Math.round(successRate * 100) / 100,
        avg_task_time: 0 // TODO: Calculate from metrics
      },
      resource_usage: {
        cost: costMetrics?.daily_cost || 0,
        tokens: resourceMetrics?.tokens_used || 0,
        budget_limit: 100 // TODO: Read from config
      },
      products: products.map(p => ({
        name: p,
        status: 'unknown'
      })),
      alerts: [],
      trends: {}
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Agent performance endpoint
app.get('/api/dashboard/performance', async (req, res) => {
  try {
    const performance = await readJSON(path.join(metricsDir, 'agent-performance.json'));
    res.json(performance || {});
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Cost tracking endpoint
app.get('/api/dashboard/costs', async (req, res) => {
  try {
    const costs = await readJSON(path.join(metricsDir, 'cost-metrics.json'));
    res.json(costs || {});
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Products endpoint
app.get('/api/dashboard/products', async (req, res) => {
  try {
    const products: any[] = [];
    
    if (await fs.access(stateFile).then(() => true).catch(() => false)) {
      const stateContent = await fs.readFile(stateFile, 'utf-8');
      const productMatches = stateContent.matchAll(/^\s+([a-z-]+):/gm);
      for (const match of productMatches) {
        products.push({
          name: match[1],
          path: `products/${match[1]}`
        });
      }
    }

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Status endpoint (uses aggregate script)
app.get('/api/dashboard/status', async (req, res) => {
  try {
    const scriptPath = path.join(repoRoot, '.claude', 'dashboard', 'aggregate-data.sh');
    const { stdout } = await execAsync(`bash ${scriptPath} status`);
    res.json({ status: stdout });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`📊 Dashboard API running on http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   - GET /api/dashboard/executive`);
  console.log(`   - GET /api/dashboard/performance`);
  console.log(`   - GET /api/dashboard/costs`);
  console.log(`   - GET /api/dashboard/products`);
  console.log(`   - GET /api/dashboard/status`);
  console.log(`   - GET /health`);
});

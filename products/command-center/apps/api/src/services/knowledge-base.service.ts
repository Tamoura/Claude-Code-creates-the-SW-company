import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  confidence: string;
  timesApplied: number;
  successRate: number;
}

export interface AgentExperienceEntry {
  agent: string;
  tasksCompleted: number;
  successRate: number;
  avgTimeMinutes: number;
  recentTasks: TaskHistoryEntry[];
}

export interface TaskHistoryEntry {
  taskId: string;
  product: string;
  status: string;
  summary: string;
  timestamp: string;
}

export interface KnowledgeBase {
  patterns: Pattern[];
  agentExperiences: AgentExperienceEntry[];
}

export interface SearchResult {
  type: 'pattern' | 'experience';
  id: string;
  title: string;
  snippet: string;
  score: number;
}

/** Cache with 60s TTL */
let cache: { data: KnowledgeBase; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getKnowledgeBase(): KnowledgeBase {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const patterns = loadPatterns();
  const agentExperiences = loadAgentExperiences();

  const data: KnowledgeBase = { patterns, agentExperiences };
  cache = { data, ts: Date.now() };
  return data;
}

export function searchKnowledgeBase(query: string): SearchResult[] {
  const kb = getKnowledgeBase();
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const p of kb.patterns) {
    const searchable = `${p.name} ${p.description} ${p.problem} ${p.solution} ${p.category}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({
        type: 'pattern',
        id: p.id,
        title: p.name,
        snippet: p.description.slice(0, 200),
        score: computeScore(searchable, q),
      });
    }
  }

  for (const exp of kb.agentExperiences) {
    for (const task of exp.recentTasks) {
      const searchable = `${exp.agent} ${task.product} ${task.summary}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({
          type: 'experience',
          id: `${exp.agent}:${task.taskId}`,
          title: `${exp.agent} - ${task.taskId}`,
          snippet: task.summary.slice(0, 200),
          score: computeScore(searchable, q),
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function computeScore(text: string, query: string): number {
  let score = 0;
  let idx = 0;
  while ((idx = text.indexOf(query, idx)) !== -1) {
    score++;
    idx += query.length;
  }
  return score;
}

function loadPatterns(): Pattern[] {
  const knowledgePath = repoPath('.claude', 'memory', 'company-knowledge.json');
  if (!existsSync(knowledgePath)) return [];

  try {
    const raw = JSON.parse(readFileSync(knowledgePath, 'utf-8'));
    const patterns = raw.patterns ?? [];
    return patterns.map((p: Record<string, unknown>) => ({
      id: (p.id as string) ?? '',
      name: (p.name as string) ?? '',
      category: (p.category as string) ?? '',
      description: (p.description as string) ?? '',
      problem: (p.problem as string) ?? '',
      solution: (p.solution as string) ?? '',
      confidence: (p.confidence as string) ?? 'unknown',
      timesApplied: (p.times_applied as number) ?? 0,
      successRate: (p.success_rate as number) ?? 0,
    }));
  } catch {
    return [];
  }
}

function loadAgentExperiences(): AgentExperienceEntry[] {
  const expDir = repoPath('.claude', 'memory', 'agent-experiences');
  if (!existsSync(expDir)) return [];

  const results: AgentExperienceEntry[] = [];
  try {
    const files = readdirSync(expDir).filter((f) => f.endsWith('.json') && !f.endsWith('.bak'));
    for (const file of files) {
      try {
        const raw = JSON.parse(readFileSync(join(expDir, file), 'utf-8'));
        const metrics = raw.performance_metrics ?? {};
        const history = (raw.task_history ?? []) as Record<string, unknown>[];

        results.push({
          agent: (raw.agent as string) ?? file.replace('.json', ''),
          tasksCompleted: (metrics.tasks_completed as number) ?? 0,
          successRate: (metrics.success_rate as number) ?? 0,
          avgTimeMinutes: (metrics.average_time_minutes as number) ?? 0,
          recentTasks: history.slice(-10).map((t) => ({
            taskId: (t.task_id as string) ?? '',
            product: (t.product as string) ?? '',
            status: (t.status as string) ?? '',
            summary: (t.summary as string) ?? '',
            timestamp: (t.timestamp as string) ?? '',
          })),
        });
      } catch { /* skip malformed files */ }
    }
  } catch { /* ignore */ }

  return results.sort((a, b) => a.agent.localeCompare(b.agent));
}

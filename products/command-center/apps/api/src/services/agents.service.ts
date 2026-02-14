import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface Agent {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  hasExperience: boolean;
  experienceSummary: AgentExperience | null;
}

export interface AgentExperience {
  tasksCompleted: number;
  successRate: number;
  avgDuration: string;
  learnedPatterns: string[];
}

/** List all agent definitions */
export function listAgents(): Agent[] {
  const agentsDir = repoPath('.claude', 'agents');
  if (!existsSync(agentsDir)) return [];

  return readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseAgentFile(f))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getAgent(id: string): Agent | null {
  const filePath = repoPath('.claude', 'agents', `${id}.md`);
  if (!existsSync(filePath)) return null;
  return parseAgentFile(`${id}.md`);
}

function parseAgentFile(filename: string): Agent {
  const id = filename.replace('.md', '');
  const filePath = repoPath('.claude', 'agents', filename);
  const content = readFileSync(filePath, 'utf-8');

  // Extract name from first heading
  const nameMatch = content.match(/^#\s+(.+)/m);
  const name = nameMatch ? nameMatch[1].trim() : id.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  // Extract description (first non-heading paragraph)
  const lines = content.split('\n');
  let description = '';
  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;
    description = line.trim().slice(0, 300);
    break;
  }

  // Extract responsibilities (look for bullet points under ## Responsibilities)
  const responsibilities: string[] = [];
  let inResponsibilities = false;
  for (const line of lines) {
    if (/^##\s+responsibilities/i.test(line)) {
      inResponsibilities = true;
      continue;
    }
    if (inResponsibilities && line.startsWith('##')) break;
    if (inResponsibilities && /^\s*[-*]\s+/.test(line)) {
      responsibilities.push(line.replace(/^\s*[-*]\s+/, '').trim());
    }
  }

  // Check for experience data
  const experiencePath = repoPath('.claude', 'memory', 'agent-experiences', `${id}.json`);
  const hasExperience = existsSync(experiencePath);
  let experienceSummary: AgentExperience | null = null;

  if (hasExperience) {
    try {
      const data = JSON.parse(readFileSync(experiencePath, 'utf-8'));
      experienceSummary = {
        tasksCompleted: data.tasks_completed ?? data.tasksCompleted ?? 0,
        successRate: data.success_rate ?? data.successRate ?? 0,
        avgDuration: data.avg_duration ?? data.avgDuration ?? 'N/A',
        learnedPatterns: (data.learned_patterns ?? data.learnedPatterns ?? []).slice(0, 5),
      };
    } catch { /* ignore malformed JSON */ }
  }

  return { id, name, description, responsibilities: responsibilities.slice(0, 10), hasExperience, experienceSummary };
}

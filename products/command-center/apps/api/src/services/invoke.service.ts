import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { repoRoot } from './repo.service.js';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  command: string;
  status: JobStatus;
  output: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  exitCode: number | null;
}

/** In-memory job store (sufficient for single-user internal tool) */
const jobs = new Map<string, Job>();
const processes = new Map<string, ChildProcess>();

/** Max output lines per job to prevent memory issues */
const MAX_OUTPUT_LINES = 5000;

/** Max concurrent jobs */
const MAX_CONCURRENT = 3;

/** Create and queue a new invocation job */
export function createJob(command: string): Job {
  const running = [...jobs.values()].filter((j) => j.status === 'running');
  if (running.length >= MAX_CONCURRENT) {
    throw new Error(`Max concurrent jobs (${MAX_CONCURRENT}) reached. Wait for a running job to complete.`);
  }

  const job: Job = {
    id: randomUUID(),
    command,
    status: 'queued',
    output: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    exitCode: null,
  };

  jobs.set(job.id, job);
  return job;
}

/** Start executing a queued job */
export function startJob(id: string): Job {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  if (job.status !== 'queued') throw new Error(`Job ${id} is already ${job.status}`);

  job.status = 'running';
  job.startedAt = new Date().toISOString();

  // Spawn the process in the repo root
  const proc = spawn('bash', ['-c', job.command], {
    cwd: repoRoot(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  processes.set(id, proc);

  const appendOutput = (data: Buffer) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        if (job.output.length < MAX_OUTPUT_LINES) {
          job.output.push(line);
        }
      }
    }
  };

  proc.stdout?.on('data', appendOutput);
  proc.stderr?.on('data', appendOutput);

  proc.on('close', (code) => {
    job.status = code === 0 ? 'completed' : 'failed';
    job.exitCode = code;
    job.completedAt = new Date().toISOString();
    processes.delete(id);
  });

  proc.on('error', (err) => {
    job.status = 'failed';
    job.output.push(`Process error: ${err.message}`);
    job.completedAt = new Date().toISOString();
    processes.delete(id);
  });

  return job;
}

/** Cancel a running job */
export function cancelJob(id: string): Job {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);

  const proc = processes.get(id);
  if (proc) {
    proc.kill('SIGTERM');
    setTimeout(() => {
      if (processes.has(id)) proc.kill('SIGKILL');
    }, 5000);
  }

  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  return job;
}

/** Get a job by ID */
export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/** List all jobs, most recent first */
export function listJobs(limit = 20): Job[] {
  return [...jobs.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/** Get new output lines since a given offset */
export function getJobOutput(id: string, fromLine = 0): { lines: string[]; totalLines: number } | null {
  const job = jobs.get(id);
  if (!job) return null;
  return {
    lines: job.output.slice(fromLine),
    totalLines: job.output.length,
  };
}

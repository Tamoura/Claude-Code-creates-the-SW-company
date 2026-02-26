import { useState, useEffect, useRef, useCallback } from 'react';
import Badge from '../components/Badge.js';

interface JobSummary {
  id: string;
  command: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  outputLines: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  exitCode: number | null;
}

const PRESETS = [
  { label: 'Status Update', command: 'git status', category: 'Git' },
  { label: 'Recent Commits', command: 'git log --oneline -20', category: 'Git' },
  { label: 'Branch List', command: 'git branch -a', category: 'Git' },
  { label: 'Diff Summary', command: 'git diff --stat', category: 'Git' },
  { label: 'Docker Status', command: 'docker compose ps', category: 'Infra' },
  { label: 'Docker Logs', command: 'docker compose logs --tail=50', category: 'Infra' },
];

export default function Invoke() {
  const [command, setCommand] = useState('');
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load job history
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/invoke');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setOutput([]);
    setJobStatus(null);

    try {
      const res = await fetch('/api/v1/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start job');
        setSubmitting(false);
        return;
      }

      const jobId = data.job.id;
      setActiveJob(jobId);
      setJobStatus('running');

      // Start SSE streaming
      const eventSource = new EventSource(`/api/v1/invoke/${jobId}/stream`);
      eventSource.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          setOutput((prev) => [...prev, msg.line]);
        } else if (msg.type === 'done') {
          setJobStatus(msg.status);
          eventSource.close();
          loadJobs();
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setJobStatus('failed');
        loadJobs();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!activeJob) return;
    try {
      await fetch(`/api/v1/invoke/${activeJob}/cancel`, { method: 'POST' });
      setJobStatus('cancelled');
      loadJobs();
    } catch { /* ignore */ }
  }

  function handlePreset(cmd: string) {
    setCommand(cmd);
  }

  const statusVariant = (status: string) => {
    if (status === 'completed') return 'success';
    if (status === 'running') return 'info';
    if (status === 'failed') return 'danger';
    if (status === 'cancelled') return 'warning';
    return 'default';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Invoke</h1>
      <p className="text-slate-500 mb-6">Run commands and view live output</p>

      {/* Presets */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 mb-2">Quick Commands</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset.command}
              onClick={() => handlePreset(preset.command)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-2.5 text-slate-600 text-sm font-mono">$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              className="w-full pl-7 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={!command.trim() || submitting || jobStatus === 'running'}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Run
          </button>
          {jobStatus === 'running' && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 bg-rose-600/20 text-rose-400 text-sm font-medium rounded-lg hover:bg-rose-600/30 transition-colors border border-rose-500/30"
            >
              Cancel
            </button>
          )}
        </div>
        {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
      </form>

      {/* Terminal output */}
      {(output.length > 0 || jobStatus) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Output</p>
            {jobStatus && <Badge variant={statusVariant(jobStatus)}>{jobStatus}</Badge>}
          </div>
          <div
            ref={outputRef}
            className="bg-black border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto"
          >
            {output.map((line, i) => (
              <div key={i} className="leading-5 whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
            {jobStatus === 'running' && (
              <div className="text-indigo-400 animate-pulse mt-1">...</div>
            )}
          </div>
        </div>
      )}

      {/* Job history */}
      {jobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Job History</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <code className="text-sm text-slate-300 font-mono">{job.command}</code>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                    <span>{new Date(job.createdAt).toLocaleString()}</span>
                    <span>{job.outputLines} lines</span>
                    {job.exitCode !== null && <span>exit {job.exitCode}</span>}
                  </div>
                </div>
                <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

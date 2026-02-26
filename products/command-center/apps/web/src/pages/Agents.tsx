import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';

interface Agent {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  hasExperience: boolean;
  experienceSummary: {
    tasksCompleted: number;
    successRate: number;
    avgDuration: string;
    learnedPatterns: string[];
  } | null;
}

export default function Agents() {
  const { data, loading } = useApi<{ agents: Agent[] }>('/agents');

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-slate-800 rounded w-32 mb-6" /></div>;
  if (!data) return <p className="text-rose-400">Failed to load agents</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-50 mb-1">Agent Hub</h1>
      <p className="text-slate-500 mb-8">{data.agents.length} specialist AI agents</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.agents.map((agent) => (
          <Link key={agent.id} to={`/agents/${agent.id}`} className="block">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-50 group-hover:text-indigo-400 transition-colors">{agent.name}</h3>
                {agent.hasExperience && <Badge variant="success">Trained</Badge>}
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{agent.description}</p>

              {/* Responsibilities */}
              {agent.responsibilities.length > 0 && (
                <div className="mb-3">
                  <ul className="space-y-1">
                    {agent.responsibilities.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <span className="text-indigo-500 mt-0.5">-</span>
                        <span className="line-clamp-1">{r}</span>
                      </li>
                    ))}
                    {agent.responsibilities.length > 3 && (
                      <li className="text-xs text-slate-600">+{agent.responsibilities.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Performance stats */}
              {agent.experienceSummary && (
                <div className="border-t border-slate-700 pt-3 mt-3 flex gap-4 text-xs text-slate-500">
                  <span>{agent.experienceSummary.tasksCompleted} tasks</span>
                  {agent.experienceSummary.successRate > 0 && (
                    <span className="text-emerald-500">{agent.experienceSummary.successRate}% success</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

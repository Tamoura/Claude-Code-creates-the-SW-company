import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';
import StatCard from '../components/StatCard.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface AgentDetailResponse {
  agent: {
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
    fullContent: string;
    brief: string | null;
    sections: Array<{
      title: string;
      level: number;
      content: string;
    }>;
  };
}

const roleColorMap: Record<string, { bg: string; text: string }> = {
  backend: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  frontend: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  qa: { bg: 'bg-red-500/20', text: 'text-red-400' },
  security: { bg: 'bg-red-500/20', text: 'text-red-400' },
  devops: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  architect: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  product: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  writer: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  innovation: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  support: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  mobile: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  'code-reviewer': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  designer: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
};

function getRoleBadge(agentId: string): { label: string; color: { bg: string; text: string } } {
  const id = agentId.toLowerCase();

  if (id.includes('backend')) return { label: 'Backend Engineering', color: roleColorMap.backend };
  if (id.includes('frontend')) return { label: 'Frontend Engineering', color: roleColorMap.frontend };
  if (id.includes('qa')) return { label: 'Quality Assurance', color: roleColorMap.qa };
  if (id.includes('security')) return { label: 'Security', color: roleColorMap.security };
  if (id.includes('devops')) return { label: 'DevOps', color: roleColorMap.devops };
  if (id.includes('architect')) return { label: 'Architecture', color: roleColorMap.architect };
  if (id.includes('product')) return { label: 'Product Management', color: roleColorMap.product };
  if (id.includes('writer')) return { label: 'Technical Writing', color: roleColorMap.writer };
  if (id.includes('innovation')) return { label: 'Innovation', color: roleColorMap.innovation };
  if (id.includes('support')) return { label: 'Support', color: roleColorMap.support };
  if (id.includes('mobile')) return { label: 'Mobile Development', color: roleColorMap.mobile };
  if (id.includes('code-reviewer')) return { label: 'Code Review', color: roleColorMap['code-reviewer'] };
  if (id.includes('designer')) return { label: 'UI/UX Design', color: roleColorMap.designer };

  return { label: 'General', color: { bg: 'bg-gray-700', text: 'text-gray-300' } };
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useApi<AgentDetailResponse>(`/agents/${id}`);
  const [activeTab, setActiveTab] = useState<'overview' | 'definition' | 'brief'>('overview');

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-gray-800 rounded w-48" />
        <div className="h-32 bg-gray-800 rounded" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-400">Failed to load agent details</p>;

  const { agent } = data;
  const roleBadge = getRoleBadge(agent.id);

  return (
    <div>
      {/* Back Link */}
      <Link
        to="/agents"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to Agent Hub</span>
      </Link>

      {/* Agent Header Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
          <div className="flex gap-2">
            {agent.hasExperience && <Badge variant="success">Trained</Badge>}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.color.bg} ${roleBadge.color.text}`}>
              {roleBadge.label}
            </span>
          </div>
        </div>
        <p className="text-gray-400 leading-relaxed">{agent.description}</p>
      </div>

      {/* Stats Row */}
      {agent.hasExperience && agent.experienceSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tasks Completed"
            value={agent.experienceSummary.tasksCompleted}
            color="green"
          />
          <StatCard
            label="Success Rate"
            value={`${agent.experienceSummary.successRate}%`}
            color="blue"
          />
          <StatCard
            label="Avg Duration"
            value={agent.experienceSummary.avgDuration}
            color="purple"
          />
          <StatCard
            label="Learned Patterns"
            value={agent.experienceSummary.learnedPatterns.length}
            color="orange"
          />
        </div>
      )}

      {/* Tabbed Content Area */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-800 px-6 pt-6 pb-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('definition')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'definition'
                  ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              Full Definition
            </button>
            {agent.brief && (
              <button
                onClick={() => setActiveTab('brief')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'brief'
                    ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                Brief
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Responsibilities */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Responsibilities</h3>
                <ul className="space-y-2">
                  {agent.responsibilities.map((r, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Learned Patterns */}
              {agent.hasExperience && agent.experienceSummary && agent.experienceSummary.learnedPatterns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Learned Patterns</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.experienceSummary.learnedPatterns.map((pattern, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Definition Tab */}
          {activeTab === 'definition' && (
            <div className="prose prose-invert max-w-none">
              <MarkdownRenderer content={agent.fullContent} />
            </div>
          )}

          {/* Brief Tab */}
          {activeTab === 'brief' && agent.brief && (
            <div>
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  This is the compact version injected into sub-agent prompts
                </p>
              </div>
              <div className="prose prose-invert max-w-none">
                <MarkdownRenderer content={agent.brief} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

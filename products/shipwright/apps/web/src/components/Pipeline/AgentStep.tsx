import type { AgentState } from '../../lib/types';

const ROLE_LABELS: Record<string, string> = {
  'product-manager': 'Product Manager',
  architect: 'Architect',
  'backend-engineer': 'Backend Engineer',
  'frontend-engineer': 'Frontend Engineer',
  'qa-engineer': 'QA Engineer',
};

const ROLE_ICONS: Record<string, string> = {
  'product-manager': 'PM',
  architect: 'AR',
  'backend-engineer': 'BE',
  'frontend-engineer': 'FE',
  'qa-engineer': 'QA',
};

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-gray-600',
  working: 'bg-blue-500',
  done: 'bg-green-500',
  failed: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  working: 'Working...',
  done: 'Done',
  failed: 'Failed',
};

interface Props {
  agent: AgentState;
}

export function AgentStep({ agent }: Props) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        data-testid="status-indicator"
        className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[agent.status]} ${
          agent.status === 'working' ? 'animate-pulse' : ''
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200 truncate">
          {ROLE_LABELS[agent.role]}
        </div>
        <div className="text-xs text-gray-500">
          {STATUS_LABELS[agent.status]}
        </div>
      </div>
      <div className="text-xs text-gray-600 font-mono">
        {ROLE_ICONS[agent.role]}
      </div>
    </div>
  );
}

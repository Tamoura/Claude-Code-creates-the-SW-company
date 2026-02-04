import { AgentStep } from './AgentStep';
import type { AgentState } from '../../lib/types';

interface Props {
  agents: AgentState[];
  totalTokensIn: number;
  totalTokensOut: number;
}

export function PipelineSidebar({ agents, totalTokensIn, totalTokensOut }: Props) {
  const completed = agents.filter((a) => a.status === 'done').length;
  const total = agents.length;
  const totalTokens = totalTokensIn + totalTokensOut;

  return (
    <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Pipeline
      </h2>
      <div className="flex-1 space-y-1">
        {agents.map((agent) => (
          <AgentStep key={agent.role} agent={agent} />
        ))}
      </div>
      <div className="border-t border-gray-800 pt-3 mt-3 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Tokens</span>
          <span className="font-mono">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span className="font-mono">{completed}/{total}</span>
        </div>
      </div>
    </div>
  );
}

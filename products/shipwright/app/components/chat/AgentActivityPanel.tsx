import { useState } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ProgressAnnotation } from '~/types/context';
import { classNames } from '~/utils/classNames';

export interface AgentStatus {
  role: string;
  displayName: string;
  status: 'in-progress' | 'complete';
  message: string;
  order: number;
}

const UPPERCASE_WORDS = new Set(['qa', 'ai', 'ui', 'ux', 'api', 'ci', 'cd']);

function formatRoleName(role: string): string {
  return role
    .split('-')
    .map((word) => {
      if (UPPERCASE_WORDS.has(word.toLowerCase())) {
        return word.toUpperCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function extractAgentStatuses(annotations: ProgressAnnotation[] | undefined): AgentStatus[] {
  if (!annotations || annotations.length === 0) {
    return [];
  }

  const agentMap = new Map<string, AgentStatus>();

  for (const annotation of annotations) {
    // Skip orchestrator-level annotations
    if (annotation.label === 'orchestrator') {
      continue;
    }

    agentMap.set(annotation.label, {
      role: annotation.label,
      displayName: formatRoleName(annotation.label),
      status: annotation.status,
      message: annotation.message,
      order: annotation.order,
    });
  }

  return Array.from(agentMap.values()).sort((a, b) => a.order - b.order);
}

interface AgentActivityPanelProps {
  annotations: ProgressAnnotation[];
  onClose?: () => void;
}

export const AgentActivityPanel: FC<AgentActivityPanelProps> = ({ annotations, onClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const agents = extractAgentStatuses(annotations);

  if (agents.length === 0) {
    return null;
  }

  const completedCount = agents.filter((a) => a.status === 'complete').length;
  const totalCount = agents.length;

  return (
    <motion.div
      className={classNames(
        'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
        'rounded-lg shadow-lg overflow-hidden',
        'w-64 flex-shrink-0',
      )}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between p-3 border-b border-bolt-elements-borderColor">
        <span className="text-sm font-medium text-bolt-elements-textPrimary">Agent Team</span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textSecondary"
            onClick={() => setCollapsed(!collapsed)}
          >
            <div className={collapsed ? 'i-ph:caret-down text-sm' : 'i-ph:caret-up text-sm'} />
          </button>
          {onClose && (
            <button
              className="p-1 rounded hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textSecondary"
              onClick={onClose}
            >
              <div className="i-ph:x text-sm" />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.role}
                  className="flex items-start gap-2 p-2 rounded text-sm"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {agent.status === 'in-progress' ? (
                      <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress" />
                    ) : (
                      <div className="i-ph:check-circle text-green-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-bolt-elements-textPrimary truncate">
                      {agent.displayName}
                    </div>
                    <div className="text-xs text-bolt-elements-textSecondary truncate">
                      {agent.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-bolt-elements-borderColor text-xs text-bolt-elements-textSecondary">
              Agents: {completedCount}/{totalCount} done
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

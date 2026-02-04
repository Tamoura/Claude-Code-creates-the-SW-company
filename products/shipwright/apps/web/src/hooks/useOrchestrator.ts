import { useState, useCallback, useRef } from 'react';
import { parseSSELine } from '../lib/sse-parser';
import { parseArtifacts } from '../lib/artifact-parser';
import type { AgentRole, AgentState, AgentStatus, ChatMessage } from '../lib/types';

const ALL_ROLES: AgentRole[] = [
  'product-manager',
  'architect',
  'backend-engineer',
  'frontend-engineer',
  'qa-engineer',
];

function initialAgentStates(): AgentState[] {
  return ALL_ROLES.map((role) => ({
    role,
    status: 'waiting' as AgentStatus,
    tokensIn: 0,
    tokensOut: 0,
  }));
}

export function useOrchestrator() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStates, setAgentStates] = useState<AgentState[]>(initialAgentStates());
  const [files, setFiles] = useState<Map<string, string>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const [totalTokensIn, setTotalTokensIn] = useState(0);
  const [totalTokensOut, setTotalTokensOut] = useState(0);
  const currentAgentRef = useRef<AgentRole | null>(null);
  const textBufferRef = useRef('');

  const send = useCallback(async (prompt: string, modelId: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setAgentStates(initialAgentStates());
    setFiles(new Map());
    setIsStreaming(true);
    setTotalTokensIn(0);
    setTotalTokensOut(0);
    currentAgentRef.current = null;
    textBufferRef.current = '';

    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId }),
      });

      if (!response.ok || !response.body) {
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = parseSSELine(line);
          if (!parsed) continue;

          switch (parsed.type) {
            case 'text': {
              textBufferRef.current += parsed.data;
              const agentRole = currentAgentRef.current;
              const content = textBufferRef.current;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant' && last.agentRole === agentRole) {
                  return [...prev.slice(0, -1), { ...last, content }];
                }
                return [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content,
                    agentRole: agentRole ?? undefined,
                  },
                ];
              });

              // Extract files from accumulated text
              const parsed2 = parseArtifacts(textBufferRef.current);
              if (parsed2.length > 0) {
                setFiles((prev) => {
                  const next = new Map(prev);
                  for (const f of parsed2) {
                    next.set(f.path, f.content);
                  }
                  return next;
                });
              }
              break;
            }

            case 'progress': {
              const data = parsed.data as Record<string, string>;
              const eventType = data.type;
              const agentRole = data.agentRole as AgentRole | undefined;

              if (eventType === 'agent-started' && agentRole) {
                currentAgentRef.current = agentRole;
                textBufferRef.current = '';
                setAgentStates((prev) =>
                  prev.map((a) =>
                    a.role === agentRole ? { ...a, status: 'working' } : a,
                  ),
                );
              } else if (eventType === 'agent-completed' && agentRole) {
                setAgentStates((prev) =>
                  prev.map((a) =>
                    a.role === agentRole ? { ...a, status: 'done' } : a,
                  ),
                );
              } else if (eventType === 'agent-failed' && agentRole) {
                setAgentStates((prev) =>
                  prev.map((a) =>
                    a.role === agentRole ? { ...a, status: 'failed' } : a,
                  ),
                );
              }
              break;
            }

            case 'usage': {
              const { tokensIn, tokensOut } = parsed.data;
              setTotalTokensIn((prev) => prev + tokensIn);
              setTotalTokensOut((prev) => prev + tokensOut);
              if (currentAgentRef.current) {
                const role = currentAgentRef.current;
                setAgentStates((prev) =>
                  prev.map((a) =>
                    a.role === role
                      ? { ...a, tokensIn: a.tokensIn + tokensIn, tokensOut: a.tokensOut + tokensOut }
                      : a,
                  ),
                );
              }
              break;
            }
          }
        }
      }
    } catch {
      // Network error - silently stop
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    agentStates,
    files,
    isStreaming,
    totalTokensIn,
    totalTokensOut,
    send,
  };
}

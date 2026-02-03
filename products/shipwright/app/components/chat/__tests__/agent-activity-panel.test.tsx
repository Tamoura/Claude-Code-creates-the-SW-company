import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProgressAnnotation } from '~/types/context';

// --- AgentActivityPanel unit tests ---

describe('AgentActivityPanel', () => {
  it('should export AgentActivityPanel component', async () => {
    const module = await import('~/components/chat/AgentActivityPanel');
    expect(module.AgentActivityPanel).toBeDefined();
  });

  it('should export extractAgentStatuses utility', async () => {
    const module = await import('~/components/chat/AgentActivityPanel');
    expect(module.extractAgentStatuses).toBeDefined();
    expect(typeof module.extractAgentStatuses).toBe('function');
  });
});

describe('extractAgentStatuses', () => {
  let extractAgentStatuses: typeof import('~/components/chat/AgentActivityPanel').extractAgentStatuses;

  beforeEach(async () => {
    const module = await import('~/components/chat/AgentActivityPanel');
    extractAgentStatuses = module.extractAgentStatuses;
  });

  it('should return empty array for empty input', () => {
    expect(extractAgentStatuses([])).toEqual([]);
  });

  it('should return empty array for undefined input', () => {
    expect(extractAgentStatuses(undefined)).toEqual([]);
  });

  it('should extract agent roles from progress annotations', () => {
    const annotations: ProgressAnnotation[] = [
      { type: 'progress', label: 'product-manager', status: 'in-progress', order: 2, message: 'Product Manager is working...' },
      { type: 'progress', label: 'architect', status: 'in-progress', order: 3, message: 'Architect is working...' },
    ];

    const result = extractAgentStatuses(annotations);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('product-manager');
    expect(result[1].role).toBe('architect');
  });

  it('should filter out orchestrator-level annotations', () => {
    const annotations: ProgressAnnotation[] = [
      { type: 'progress', label: 'orchestrator', status: 'in-progress', order: 0, message: 'Starting multi-agent workflow' },
      { type: 'progress', label: 'product-manager', status: 'in-progress', order: 2, message: 'Product Manager is working...' },
      { type: 'progress', label: 'orchestrator', status: 'complete', order: 0, message: 'All agents completed' },
    ];

    const result = extractAgentStatuses(annotations);
    // Should only contain agent roles, not orchestrator
    expect(result.every((a) => a.role !== 'orchestrator')).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('product-manager');
  });

  it('should use latest status for each agent', () => {
    const annotations: ProgressAnnotation[] = [
      { type: 'progress', label: 'product-manager', status: 'in-progress', order: 2, message: 'Product Manager is working...' },
      { type: 'progress', label: 'product-manager', status: 'complete', order: 2, message: 'Product Manager completed' },
    ];

    const result = extractAgentStatuses(annotations);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('complete');
    expect(result[0].message).toBe('Product Manager completed');
  });

  it('should sort agents by order', () => {
    const annotations: ProgressAnnotation[] = [
      { type: 'progress', label: 'backend-engineer', status: 'in-progress', order: 4, message: 'Working...' },
      { type: 'progress', label: 'product-manager', status: 'complete', order: 2, message: 'Done' },
      { type: 'progress', label: 'architect', status: 'complete', order: 3, message: 'Done' },
    ];

    const result = extractAgentStatuses(annotations);
    expect(result[0].role).toBe('product-manager');
    expect(result[1].role).toBe('architect');
    expect(result[2].role).toBe('backend-engineer');
  });

  it('should format role names as display names', () => {
    const annotations: ProgressAnnotation[] = [
      { type: 'progress', label: 'product-manager', status: 'complete', order: 2, message: 'Done' },
      { type: 'progress', label: 'backend-engineer', status: 'in-progress', order: 4, message: 'Working' },
      { type: 'progress', label: 'qa-engineer', status: 'in-progress', order: 6, message: 'Waiting' },
    ];

    const result = extractAgentStatuses(annotations);
    expect(result[0].displayName).toBe('Product Manager');
    expect(result[1].displayName).toBe('Backend Engineer');
    expect(result[2].displayName).toBe('QA Engineer');
  });

  it('should count completed and total agents', () => {
    const annotations: ProgressAnnotation[] = [
      { type: 'progress', label: 'product-manager', status: 'complete', order: 2, message: 'Done' },
      { type: 'progress', label: 'architect', status: 'complete', order: 3, message: 'Done' },
      { type: 'progress', label: 'backend-engineer', status: 'in-progress', order: 4, message: 'Working' },
      { type: 'progress', label: 'frontend-engineer', status: 'in-progress', order: 5, message: 'Waiting' },
    ];

    const result = extractAgentStatuses(annotations);
    const completed = result.filter((a) => a.status === 'complete').length;
    const total = result.length;

    expect(completed).toBe(2);
    expect(total).toBe(4);
  });
});

// --- BaseChat integration ---

describe('AgentActivityPanel: BaseChat integration', () => {
  it('should render AgentActivityPanel conditionally in BaseChat', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const baseChatPath = path.resolve(__dirname, '..', 'BaseChat.tsx');
    const source = fs.readFileSync(baseChatPath, 'utf-8');

    expect(source).toContain('AgentActivityPanel');
    expect(source).toContain('orchestratorMode');
  });
});

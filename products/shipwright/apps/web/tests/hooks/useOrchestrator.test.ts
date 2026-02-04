import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrchestrator } from '../../src/hooks/useOrchestrator';

function createMockStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const joined = lines.join('\n') + '\n';
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(joined));
      controller.close();
    },
  });
}

describe('useOrchestrator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useOrchestrator());

    expect(result.current.messages).toEqual([]);
    expect(result.current.agentStates).toHaveLength(5);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.files.size).toBe(0);
  });

  it('should have all 5 agent roles in initial state', () => {
    const { result } = renderHook(() => useOrchestrator());

    const roles = result.current.agentStates.map((a) => a.role);
    expect(roles).toContain('product-manager');
    expect(roles).toContain('architect');
    expect(roles).toContain('backend-engineer');
    expect(roles).toContain('frontend-engineer');
    expect(roles).toContain('qa-engineer');
  });

  it('should set isStreaming=true when sending a message', async () => {
    const mockStream = createMockStream([
      '2:{"type":"workflow-started"}',
      '2:{"type":"workflow-completed"}',
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useOrchestrator());

    act(() => {
      result.current.send('Build a todo app', 'anthropic/claude-sonnet-4');
    });

    expect(result.current.isStreaming).toBe(true);

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });

  it('should add user message when sending', async () => {
    const mockStream = createMockStream(['2:{"type":"workflow-completed"}']);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      result.current.send('Build a todo app', 'anthropic/claude-sonnet-4');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Build a todo app');
  });

  it('should update agent status from progress events', async () => {
    const mockStream = createMockStream([
      '2:{"type":"agent-started","agentRole":"product-manager"}',
      '0:"Here is the plan"',
      '2:{"type":"agent-completed","agentRole":"product-manager"}',
      '8:{"tokensIn":100,"tokensOut":200}',
      '2:{"type":"workflow-completed"}',
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      result.current.send('Build a todo app', 'anthropic/claude-sonnet-4');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const pm = result.current.agentStates.find((a) => a.role === 'product-manager');
    expect(pm?.status).toBe('done');
  });

  it('should accumulate text into assistant messages', async () => {
    const mockStream = createMockStream([
      '2:{"type":"agent-started","agentRole":"product-manager"}',
      '0:"Hello "',
      '0:"World"',
      '2:{"type":"agent-completed","agentRole":"product-manager"}',
      '2:{"type":"workflow-completed"}',
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      result.current.send('Build a todo app', 'anthropic/claude-sonnet-4');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    const assistantMessages = result.current.messages.filter((m) => m.role === 'assistant');
    expect(assistantMessages.length).toBeGreaterThan(0);
    expect(assistantMessages[0].content).toContain('Hello ');
  });
});

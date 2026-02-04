import { describe, it, expect, vi } from 'vitest';
import { StreamWriter } from '../../src/lib/stream-writer';
import type { FastifyReply } from 'fastify';

function createMockReply(): FastifyReply & { chunks: string[] } {
  const chunks: string[] = [];
  return {
    chunks,
    raw: {
      write: vi.fn((data: string) => {
        chunks.push(data);
        return true;
      }),
      end: vi.fn(),
    },
    header: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    hijack: vi.fn(),
  } as any;
}

describe('StreamWriter', () => {
  it('should write text chunks in 0: format', () => {
    const reply = createMockReply();
    const writer = new StreamWriter(reply);

    writer.writeText('Hello world');

    expect(reply.chunks[0]).toBe('0:"Hello world"\n');
  });

  it('should escape special characters in text', () => {
    const reply = createMockReply();
    const writer = new StreamWriter(reply);

    writer.writeText('Line 1\nLine 2');

    expect(reply.chunks[0]).toBe('0:"Line 1\\nLine 2"\n');
  });

  it('should write progress events in 2: format', () => {
    const reply = createMockReply();
    const writer = new StreamWriter(reply);

    writer.writeProgress({
      type: 'agent-started',
      agentRole: 'product-manager',
      taskId: 'plan',
    });

    const parsed = JSON.parse(reply.chunks[0].slice(2).trim());
    expect(parsed.type).toBe('agent-started');
    expect(parsed.agentRole).toBe('product-manager');
  });

  it('should write usage data in 8: format', () => {
    const reply = createMockReply();
    const writer = new StreamWriter(reply);

    writer.writeUsage({ tokensIn: 100, tokensOut: 200 });

    const line = reply.chunks[0];
    expect(line.startsWith('8:')).toBe(true);
    const parsed = JSON.parse(line.slice(2).trim());
    expect(parsed.tokensIn).toBe(100);
    expect(parsed.tokensOut).toBe(200);
  });

  it('should close the stream', () => {
    const reply = createMockReply();
    const writer = new StreamWriter(reply);

    writer.close();

    expect(reply.raw.end).toHaveBeenCalled();
  });
});

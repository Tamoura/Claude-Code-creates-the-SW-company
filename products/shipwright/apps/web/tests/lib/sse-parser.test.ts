import { describe, it, expect } from 'vitest';
import { parseSSELine } from '../../src/lib/sse-parser';

describe('parseSSELine', () => {
  it('should parse text lines (0: prefix)', () => {
    const result = parseSSELine('0:"Hello world"');

    expect(result).toEqual({ type: 'text', data: 'Hello world' });
  });

  it('should parse escaped newlines in text', () => {
    const result = parseSSELine('0:"Line 1\\nLine 2"');

    expect(result).toEqual({ type: 'text', data: 'Line 1\nLine 2' });
  });

  it('should parse progress lines (2: prefix)', () => {
    const result = parseSSELine('2:{"type":"agent-started","agentRole":"product-manager"}');

    expect(result).toEqual({
      type: 'progress',
      data: { type: 'agent-started', agentRole: 'product-manager' },
    });
  });

  it('should parse usage lines (8: prefix)', () => {
    const result = parseSSELine('8:{"tokensIn":100,"tokensOut":200}');

    expect(result).toEqual({
      type: 'usage',
      data: { tokensIn: 100, tokensOut: 200 },
    });
  });

  it('should return null for empty lines', () => {
    expect(parseSSELine('')).toBeNull();
    expect(parseSSELine('  ')).toBeNull();
  });

  it('should return null for unknown prefixes', () => {
    expect(parseSSELine('9:something')).toBeNull();
  });
});

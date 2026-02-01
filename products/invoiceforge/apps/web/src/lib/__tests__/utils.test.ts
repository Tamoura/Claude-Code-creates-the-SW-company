import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (classname utility)', () => {
  it('merges class names', () => {
    const result = cn('bg-red-500', 'text-white');
    expect(result).toContain('bg-red-500');
    expect(result).toContain('text-white');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'excluded', 'always');
    expect(result).toContain('base');
    expect(result).toContain('always');
    expect(result).not.toContain('excluded');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toContain('base');
    expect(result).toContain('end');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });
});

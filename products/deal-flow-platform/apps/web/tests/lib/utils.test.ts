import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toBe('base visible');
  });

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('resolves Tailwind conflicts with tailwind-merge', () => {
    // tailwind-merge should resolve p-4 + p-6 to p-6
    const result = cn('p-4', 'p-6');
    expect(result).toBe('p-6');
  });

  it('resolves conflicting text colors', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles array of classes via clsx', () => {
    const result = cn(['foo', 'bar']);
    expect(result).toBe('foo bar');
  });

  it('handles object syntax', () => {
    const result = cn({ 'bg-red': true, 'bg-blue': false, 'text-white': true });
    expect(result).toBe('bg-red text-white');
  });
});

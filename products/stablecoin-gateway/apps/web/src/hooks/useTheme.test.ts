import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light theme when no localStorage value', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('reads dark theme from localStorage', () => {
    localStorage.setItem('stableflow-theme', 'dark');
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme switches from light to dark', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('stableflow-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggleTheme switches from dark to light', () => {
    localStorage.setItem('stableflow-theme', 'dark');
    document.documentElement.classList.add('dark');

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('stableflow-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applies dark class to document on mount when theme is dark', () => {
    localStorage.setItem('stableflow-theme', 'dark');

    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

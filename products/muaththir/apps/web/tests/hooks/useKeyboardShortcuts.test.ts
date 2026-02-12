import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

function fireKeyDown(options: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to observe page on Ctrl+K', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeyDown({ key: 'k', ctrlKey: true });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/observe');
  });

  it('navigates to observe page on Cmd+K (Mac)', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeyDown({ key: 'k', metaKey: true });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/observe');
  });

  it('does not navigate on K without modifier', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeyDown({ key: 'k' });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('calls onEscape callback when Escape is pressed', () => {
    const onEscape = jest.fn();
    renderHook(() => useKeyboardShortcuts({ onEscape }));

    act(() => {
      fireKeyDown({ key: 'Escape' });
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not call onEscape if not provided', () => {
    // Should not throw
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeyDown({ key: 'Escape' });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not intercept Ctrl+K when user is typing in an input', () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(mockPush).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not intercept Ctrl+K when user is typing in a textarea', () => {
    renderHook(() => useKeyboardShortcuts());

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(mockPush).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();

    act(() => {
      fireKeyDown({ key: 'k', ctrlKey: true });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

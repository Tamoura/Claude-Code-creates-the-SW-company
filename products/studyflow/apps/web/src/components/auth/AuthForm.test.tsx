import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

import { AuthForm } from './AuthForm';

function mockFetch(impl: (url: string, init: RequestInit) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(impl(String(input), init ?? {}))
    )
  );
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replace.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows a validation error for short signup passwords', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    await user.type(screen.getByLabelText(/email/i), 'student@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/at least 8 characters/i)
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('submits valid credentials and redirects to the dashboard', async () => {
    const user = userEvent.setup();
    mockFetch(
      () =>
        new Response(JSON.stringify({ student: { id: '1' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
    );

    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText(/email/i), 'student@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('surfaces the API error message on a failed login (RFC 7807)', async () => {
    const user = userEvent.setup();
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ status: 401, detail: 'email or password invalid' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        )
    );

    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText(/email/i), 'student@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(
      await screen.findByText(/email or password invalid/i)
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

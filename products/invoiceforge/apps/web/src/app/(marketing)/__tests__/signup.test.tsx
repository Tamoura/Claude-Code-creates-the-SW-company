import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupPage from '../signup/page';

vi.mock('@/lib/api', () => ({
  register: vi.fn(),
}));

import { register } from '@/lib/api';
const mockRegister = vi.mocked(register);

import { useRouter } from 'next/navigation';
const mockRouter = vi.mocked(useRouter);

describe('SignupPage', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('renders the signup form', () => {
    render(<SignupPage />);
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(
      screen.getByText('Start generating professional invoices in seconds')
    ).toBeInTheDocument();
  });

  it('renders name, email, and password fields', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders create account button', () => {
    render(<SignupPage />);
    expect(
      screen.getByRole('button', { name: 'Create account' })
    ).toBeInTheDocument();
  });

  it('renders login link', () => {
    render(<SignupPage />);
    const loginLink = screen.getByRole('link', { name: 'Sign in' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('calls register API on form submission', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({
      user: { id: '1', email: 'new@test.com', name: 'New User' } as never,
      accessToken: 'token',
    });

    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'New User');
    await user.type(screen.getByLabelText('Email'), 'new@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'New User',
        'new@test.com',
        'password123'
      );
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows loading state during registration', async () => {
    const user = userEvent.setup();
    let resolveRegister: (value: unknown) => void;
    mockRegister.mockImplementationOnce(
      () => new Promise((resolve) => { resolveRegister = resolve; })
    );

    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'Test');
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      screen.getByRole('button', { name: 'Creating account...' })
    ).toBeDisabled();

    resolveRegister!({
      user: { id: '1', email: 'test@test.com', name: 'Test' },
      accessToken: 'token',
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create account' })
      ).not.toBeDisabled();
    });
  });

  it('displays error message on registration failure', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

    render(<SignupPage />);

    await user.type(screen.getByLabelText('Full Name'), 'Test');
    await user.type(screen.getByLabelText('Email'), 'dup@test.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('sets password field minimum length to 8', () => {
    render(<SignupPage />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('minLength', '8');
  });
});

/**
 * Tests for the Login page
 * @task FRONTEND-01
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Must mock before importing LoginPage since it uses 'use client'
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    login: jest.fn(),
    isLoading: false,
    error: null,
    user: null,
    isAuthenticated: false,
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => '/login'),
}));

jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Dynamic import to avoid issues with 'use client'
import LoginPage from '@/app/login/page';

describe('Login Page', () => {
  test('[FRONTEND-01][AC-6] login form has email field with associated label', () => {
    render(<LoginPage />);

    const emailLabel = screen.getByLabelText(/email address/i);
    expect(emailLabel).toBeInTheDocument();
    expect(emailLabel).toHaveAttribute('type', 'email');
  });

  test('[FRONTEND-01][AC-6b] login form has password field with associated label', () => {
    render(<LoginPage />);

    const passwordLabel = screen.getByLabelText(/password/i);
    expect(passwordLabel).toBeInTheDocument();
    expect(passwordLabel).toHaveAttribute('type', 'password');
  });

  test('[FRONTEND-01][AC-7] login form shows validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      // Should show a validation error about email
      const alerts = screen.queryAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  test('[FRONTEND-01][AC-7b] login form shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'notanemail');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      const errorMessages = screen.queryAllByRole('alert');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  test('[FRONTEND-01][AC-6c] login page has a heading', () => {
    render(<LoginPage />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent?.toLowerCase()).toContain('sign in');
  });

  test('[FRONTEND-01][AC-6d] login page links to register page', () => {
    render(<LoginPage />);

    const registerLink = screen.getByRole('link', { name: /create one/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});

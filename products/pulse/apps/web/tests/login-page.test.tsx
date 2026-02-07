import { render, screen } from '@testing-library/react';
import LoginPage from '../src/app/login/page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('Login Page', () => {
  it('renders the login form with email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the GitHub OAuth button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('renders the sign in submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a link to forgot password', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('renders a link to signup', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup');
  });

  it('has the Pulse branding', () => {
    render(<LoginPage />);
    expect(screen.getByText('Pulse')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});

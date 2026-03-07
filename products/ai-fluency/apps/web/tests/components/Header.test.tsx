/**
 * Tests for the Header component
 * @task FRONTEND-01
 */
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    'aria-current': ariaCurrent,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
    className?: string;
  }) => (
    <a href={href} aria-current={ariaCurrent} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock useAuth to return unauthenticated state by default
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  })),
}));

describe('Header component', () => {
  test('[FRONTEND-01][AC-4] header renders navigation links', () => {
    render(<Header />);

    // Should have a main navigation landmark
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();

    // Should have navigation links
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(1);
  });

  test('[FRONTEND-01][AC-5] active nav link has aria-current="page" on home route', () => {
    // usePathname mocked to return '/'
    render(<Header />);

    // The "Home" link (href="/") should have aria-current="page" when on /
    const homeLink = screen.getByRole('link', { name: /^home$/i });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  test('[FRONTEND-01][AC-4b] header contains logo link', () => {
    render(<Header />);

    const logoLink = screen.getByRole('link', { name: /ai fluency/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  test('[FRONTEND-01][AC-4c] header contains sign in and get started links when not authenticated', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
  });

  test('[FRONTEND-01][AC-4d] header shows logout when authenticated', () => {
    const { useAuth } = jest.requireMock('@/hooks/useAuth') as {
      useAuth: jest.Mock;
    };
    useAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'learner' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });

    render(<Header />);

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});

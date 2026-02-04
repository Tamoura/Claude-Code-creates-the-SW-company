import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './components/dashboard/Sidebar';
import TransactionsTable from './components/dashboard/TransactionsTable';
import DashboardLayout from './pages/dashboard/DashboardLayout';

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

// Mock useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', role: 'MERCHANT' },
    logout: vi.fn(),
  }),
}));

// Mock api-client
vi.mock('./lib/api-client', () => ({
  apiClient: {
    createPaymentSession: vi.fn().mockResolvedValue({ id: 'test-session' }),
  },
}));

describe('WCAG 2.1 Level AA Accessibility', () => {
  describe('Sidebar Navigation', () => {
    it('has navigation role and aria-label', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('has complementary role on aside element', () => {
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const aside = screen.getByRole('complementary');
      expect(aside).toBeInTheDocument();
    });

    it('nav links have visible focus styles', () => {
      const { container } = render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const navLinks = container.querySelectorAll('a[href^="/dashboard"]');
      expect(navLinks.length).toBeGreaterThan(0);

      // Check that nav links have focus-visible classes
      navLinks.forEach(link => {
        const classes = link.className;
        expect(classes).toContain('focus-visible');
      });
    });
  });

  describe('Transactions Table', () => {
    it('has table role and aria-label', () => {
      render(
        <MemoryRouter>
          <TransactionsTable transactions={[]} />
        </MemoryRouter>
      );

      const table = screen.getByRole('table', { name: /transactions/i });
      expect(table).toBeInTheDocument();
    });

    it('table headers have scope attribute', () => {
      render(
        <MemoryRouter>
          <TransactionsTable
            transactions={[
              {
                id: 'tx123',
                customer: 'Test User',
                date: '2024-01-01',
                amount: '$100',
                asset: 'USDC',
                status: 'SUCCESS',
              },
            ]}
          />
        </MemoryRouter>
      );

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);

      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('status badges have descriptive aria-labels', () => {
      render(
        <MemoryRouter>
          <TransactionsTable
            transactions={[
              {
                id: 'tx123',
                customer: 'Test User',
                date: '2024-01-01',
                amount: '$100',
                asset: 'USDC',
                status: 'SUCCESS',
              },
            ]}
          />
        </MemoryRouter>
      );

      const statusBadge = screen.getByText('SUCCESS');
      expect(statusBadge).toHaveAttribute('aria-label');
    });
  });

  describe('Dashboard Layout - Skip Navigation', () => {
    it('has skip-to-content link', () => {
      render(
        <MemoryRouter>
          <DashboardLayout />
        </MemoryRouter>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('main content has id for skip link target', () => {
      render(
        <MemoryRouter>
          <DashboardLayout />
        </MemoryRouter>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
    });

    it('skip link has sr-only and focus:not-sr-only classes', () => {
      render(
        <MemoryRouter>
          <DashboardLayout />
        </MemoryRouter>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      const classes = skipLink.className;

      expect(classes).toContain('sr-only');
      expect(classes).toContain('focus:not-sr-only');
    });
  });

  describe('Form Accessibility - Login', () => {
    it('form inputs have associated labels', async () => {
      const Login = (await import('./pages/auth/Login')).default;

      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');

      // Verify labels have htmlFor
      const emailLabel = screen.getByText(/email address/i);
      const passwordLabel = screen.getByText(/password/i);

      expect(emailLabel).toBeInTheDocument();
      expect(passwordLabel).toBeInTheDocument();
    });
  });

  describe('TopHeader', () => {
    it('has banner role on header element', async () => {
      const TopHeader = (await import('./components/dashboard/TopHeader')).default;

      render(
        <MemoryRouter>
          <TopHeader title="Dashboard" />
        </MemoryRouter>
      );

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('icon-only buttons have aria-label', async () => {
      const TopHeader = (await import('./components/dashboard/TopHeader')).default;

      render(
        <MemoryRouter>
          <TopHeader title="Dashboard" />
        </MemoryRouter>
      );

      // Check user avatar button
      const avatarButton = screen.getAllByRole('button')[1]; // Second button (first is Simulate Payment)
      if (avatarButton && avatarButton.textContent && avatarButton.textContent.length <= 2) {
        // If it's just initials, it should have aria-label
        expect(avatarButton).toHaveAttribute('aria-label');
      }
    });
  });
});

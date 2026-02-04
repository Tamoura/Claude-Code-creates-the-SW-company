import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { TokenManager } from '../lib/token-manager';

// Ensure auth token is set so the dashboard renders
beforeEach(() => {
  TokenManager.setToken('mock-test-token');
});

// Mock the useAuth hook to prevent auth state issues
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  it('renders the dashboard heading', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('renders stat cards after loading', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Requests Today')).toBeInTheDocument();
      expect(screen.getByText('Active Providers')).toBeInTheDocument();
      expect(screen.getByText('Free Capacity')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });

  it('renders the recent requests table', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recent Requests')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Latency')).toBeInTheDocument();
    });
  });

  it('renders sidebar navigation items', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Providers')).toBeInTheDocument();
      expect(screen.getByText('Key Vault')).toBeInTheDocument();
      expect(screen.getByText('Playground')).toBeInTheDocument();
    });
  });

  it('displays the usage stats with values', async () => {
    renderDashboard();

    await waitFor(() => {
      // Check that stat values rendered (mock data: 847 requests today)
      expect(screen.getByText('847')).toBeInTheDocument();
    });
  });
});

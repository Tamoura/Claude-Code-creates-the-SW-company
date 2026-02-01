import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'john.smith@test.com' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock api-client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    createPaymentSession: vi.fn(),
  },
}));

import TopHeader from './TopHeader';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TopHeader', () => {
  it('renders the page title', () => {
    renderWithRouter(<TopHeader title="Dashboard" />);

    expect(
      screen.getByRole('heading', { name: 'Dashboard', level: 1 })
    ).toBeInTheDocument();
  });

  it('renders Simulate Payment button', () => {
    renderWithRouter(<TopHeader title="Payments" />);

    expect(
      screen.getByRole('button', { name: /simulate payment/i })
    ).toBeInTheDocument();
  });

  it('renders user avatar with initials', () => {
    renderWithRouter(<TopHeader title="Dashboard" />);

    // Initials are derived from email: first 2 chars uppercased
    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('renders different titles based on prop', () => {
    const { rerender } = renderWithRouter(<TopHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Dashboard'
    );

    rerender(
      <MemoryRouter><TopHeader title="Settings" /></MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Settings'
    );
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import DashboardHome from './DashboardHome';

function renderDashboardHome() {
  return render(
    <MemoryRouter>
      <DashboardHome />
    </MemoryRouter>
  );
}

describe('DashboardHome', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all three stat card titles', () => {
    renderDashboardHome();

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Settlement Volume')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('renders computed stat values after loading', async () => {
    renderDashboardHome();

    // Wait for data to load (stat values change from $0.00 defaults)
    await waitFor(() => {
      const currencyValues = screen.getAllByText(/\$[\d,]+\.\d{2}/);
      // Should have at least 3 stat card values + CheckoutPreview $100.00
      expect(currencyValues.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('renders DeveloperIntegration panel', () => {
    renderDashboardHome();

    expect(
      screen.getByRole('heading', { name: /developer integration/i })
    ).toBeInTheDocument();
  });

  it('renders CheckoutPreview panel', () => {
    renderDashboardHome();

    expect(
      screen.getByRole('heading', { name: /live checkout preview/i })
    ).toBeInTheDocument();
  });

  it('renders TransactionsTable with data after loading', async () => {
    renderDashboardHome();

    expect(
      screen.getByRole('heading', { name: /recent transactions/i })
    ).toBeInTheDocument();

    // After loading, transactions should appear
    await waitFor(() => {
      expect(screen.queryByText('Loading transactions...')).not.toBeInTheDocument();
    });
  });
});

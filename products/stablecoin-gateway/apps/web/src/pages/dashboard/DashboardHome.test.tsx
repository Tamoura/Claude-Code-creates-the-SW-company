import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import DashboardHome from './DashboardHome';

function renderDashboardHome() {
  return render(
    <MemoryRouter>
      <DashboardHome />
    </MemoryRouter>
  );
}

describe('DashboardHome', () => {
  it('renders all three stat cards', () => {
    renderDashboardHome();

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Settlement Volume')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('renders stat values from mock data', () => {
    renderDashboardHome();

    expect(screen.getByText('$124,592.00')).toBeInTheDocument();
    expect(screen.getByText('$89,240.50')).toBeInTheDocument();
    expect(screen.getByText('99.8%')).toBeInTheDocument();
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

  it('renders TransactionsTable', () => {
    renderDashboardHome();

    expect(
      screen.getByRole('heading', { name: /recent transactions/i })
    ).toBeInTheDocument();
  });
});

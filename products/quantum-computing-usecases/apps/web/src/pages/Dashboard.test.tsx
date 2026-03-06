import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import i18n from '../i18n/i18n';
import Dashboard from './Dashboard';

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('renders the dashboard heading', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/dashboard/i);
  });

  it('displays summary statistics', () => {
    renderDashboard();
    expect(screen.getByText(/total use cases/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows maturity distribution', () => {
    renderDashboard();
    expect(screen.getByText(/maturity distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/theoretical/i)).toBeInTheDocument();
    expect(screen.getByText(/experimental/i)).toBeInTheDocument();
  });

  it('displays recommendations section', () => {
    renderDashboard();
    expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
  });
});

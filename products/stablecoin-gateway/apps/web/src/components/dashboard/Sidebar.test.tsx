import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Sidebar from './Sidebar';

function renderSidebar(initialRoute = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('renders the StableFlow brand', () => {
    renderSidebar();

    expect(screen.getByText('StableFlow')).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('renders main navigation links', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /invoices/i })).toBeInTheDocument();
  });

  it('renders developer navigation links', () => {
    renderSidebar();

    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /api keys/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /webhooks/i })).toBeInTheDocument();
  });

  it('renders settings navigation links', () => {
    renderSidebar();

    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /security/i })).toBeInTheDocument();
  });

  it('links point to correct routes', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByRole('link', { name: /payments/i })).toHaveAttribute(
      'href',
      '/dashboard/payments'
    );
    expect(screen.getByRole('link', { name: /api keys/i })).toHaveAttribute(
      'href',
      '/dashboard/api-keys'
    );
    expect(screen.getByRole('link', { name: /security/i })).toHaveAttribute(
      'href',
      '/dashboard/security'
    );
  });
});

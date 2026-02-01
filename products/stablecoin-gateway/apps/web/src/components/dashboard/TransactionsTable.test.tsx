import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TransactionsTable from './TransactionsTable';

describe('TransactionsTable', () => {
  it('renders the Recent Transactions heading', () => {
    render(<TransactionsTable />);

    expect(
      screen.getByRole('heading', { name: /recent transactions/i })
    ).toBeInTheDocument();
  });

  it('renders the View All button', () => {
    render(<TransactionsTable />);

    expect(
      screen.getByRole('button', { name: /view all/i })
    ).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    render(<TransactionsTable />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Asset')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders transaction rows from mock data', () => {
    render(<TransactionsTable />);

    // Check first transaction
    expect(screen.getByText('#TX-8821')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();

    // Check second transaction
    expect(screen.getByText('#TX-8820')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();

    // Check third transaction
    expect(screen.getByText('#TX-8819')).toBeInTheDocument();
  });

  it('renders status badges with correct text', () => {
    render(<TransactionsTable />);

    const successBadges = screen.getAllByText('SUCCESS');
    const pendingBadges = screen.getAllByText('PENDING');

    expect(successBadges).toHaveLength(2);
    expect(pendingBadges).toHaveLength(1);
  });
});

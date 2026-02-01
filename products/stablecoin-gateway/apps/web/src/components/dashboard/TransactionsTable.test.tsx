import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import TransactionsTable, { type TransactionRow } from './TransactionsTable';

const mockTransactions: TransactionRow[] = [
  {
    id: '#TX-8821',
    customer: '0x4a...9f21',
    date: 'Oct 24, 2023',
    amount: '$50.00',
    asset: 'USDC',
    status: 'SUCCESS',
  },
  {
    id: '#TX-8820',
    customer: 'alice@crypto.io',
    date: 'Oct 23, 2023',
    amount: '$1,200.00',
    asset: 'DAI',
    status: 'SUCCESS',
  },
  {
    id: '#TX-8819',
    customer: '0x8b...22a1',
    date: 'Oct 23, 2023',
    amount: '$15.00',
    asset: 'USDT',
    status: 'PENDING',
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TransactionsTable', () => {
  it('renders the Recent Transactions heading', () => {
    renderWithRouter(<TransactionsTable transactions={mockTransactions} />);

    expect(
      screen.getByRole('heading', { name: /recent transactions/i })
    ).toBeInTheDocument();
  });

  it('renders the View All button', () => {
    renderWithRouter(<TransactionsTable transactions={mockTransactions} />);

    expect(
      screen.getByRole('button', { name: /view all/i })
    ).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    renderWithRouter(<TransactionsTable transactions={mockTransactions} />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Asset')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders transaction rows from props', () => {
    renderWithRouter(<TransactionsTable transactions={mockTransactions} />);

    expect(screen.getByText('#TX-8821')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('#TX-8820')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('#TX-8819')).toBeInTheDocument();
  });

  it('renders status badges with correct text', () => {
    renderWithRouter(<TransactionsTable transactions={mockTransactions} />);

    const successBadges = screen.getAllByText('SUCCESS');
    const pendingBadges = screen.getAllByText('PENDING');

    expect(successBadges).toHaveLength(2);
    expect(pendingBadges).toHaveLength(1);
  });

  it('shows loading state', () => {
    renderWithRouter(<TransactionsTable isLoading />);

    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    renderWithRouter(<TransactionsTable transactions={[]} />);

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });
});

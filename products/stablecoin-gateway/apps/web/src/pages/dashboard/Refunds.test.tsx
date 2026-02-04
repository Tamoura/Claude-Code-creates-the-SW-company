import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Refunds from './Refunds';
import * as useRefundsModule from '../../hooks/useRefunds';

vi.mock('../../hooks/useRefunds');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Refunds Page', () => {
  const mockRefunds = [
    { id: 'ref_001', payment_session_id: 'ps_001', amount: 50.00, status: 'COMPLETED' as const, reason: 'Customer request', created_at: '2026-01-15T10:00:00Z' },
    { id: 'ref_002', payment_session_id: 'ps_002', amount: 25.50, status: 'PENDING' as const, created_at: '2026-01-16T10:00:00Z' },
    { id: 'ref_003', payment_session_id: 'ps_003', amount: 100.00, status: 'FAILED' as const, reason: 'Insufficient funds', created_at: '2026-01-17T10:00:00Z' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useRefundsModule, 'useRefunds').mockReturnValue({
      refunds: mockRefunds,
      isLoading: false,
      error: null,
      totalCount: 3,
      hasMore: false,
      createRefund: vi.fn(),
      refresh: vi.fn(),
      setStatusFilter: vi.fn(),
      statusFilter: undefined,
    });
  });

  it('renders the refunds page heading', () => {
    renderWithRouter(<Refunds />);
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText(/3 total refund/)).toBeInTheDocument();
  });

  it('renders status filter buttons', () => {
    renderWithRouter(<Refunds />);
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
  });

  it('renders refund data in table', () => {
    renderWithRouter(<Refunds />);
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$25.50')).toBeInTheDocument();
    expect(screen.getByText('Customer request')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.spyOn(useRefundsModule, 'useRefunds').mockReturnValue({
      refunds: [],
      isLoading: true,
      error: null,
      totalCount: 0,
      hasMore: false,
      createRefund: vi.fn(),
      refresh: vi.fn(),
      setStatusFilter: vi.fn(),
      statusFilter: undefined,
    });
    renderWithRouter(<Refunds />);
    expect(screen.getByText(/loading refunds/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.spyOn(useRefundsModule, 'useRefunds').mockReturnValue({
      refunds: [],
      isLoading: false,
      error: 'Failed to load',
      totalCount: 0,
      hasMore: false,
      createRefund: vi.fn(),
      refresh: vi.fn(),
      setStatusFilter: vi.fn(),
      statusFilter: undefined,
    });
    renderWithRouter(<Refunds />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    vi.spyOn(useRefundsModule, 'useRefunds').mockReturnValue({
      refunds: [],
      isLoading: false,
      error: null,
      totalCount: 0,
      hasMore: false,
      createRefund: vi.fn(),
      refresh: vi.fn(),
      setStatusFilter: vi.fn(),
      statusFilter: undefined,
    });
    renderWithRouter(<Refunds />);
    expect(screen.getByText(/no refunds yet/i)).toBeInTheDocument();
  });

  it('calls setStatusFilter when filter button is clicked', () => {
    const mockSetFilter = vi.fn();
    vi.spyOn(useRefundsModule, 'useRefunds').mockReturnValue({
      refunds: mockRefunds,
      isLoading: false,
      error: null,
      totalCount: 3,
      hasMore: false,
      createRefund: vi.fn(),
      refresh: vi.fn(),
      setStatusFilter: mockSetFilter,
      statusFilter: undefined,
    });
    renderWithRouter(<Refunds />);

    fireEvent.click(screen.getByRole('button', { name: /pending/i }));
    expect(mockSetFilter).toHaveBeenCalledWith('PENDING');
  });

  it('renders table headers', () => {
    renderWithRouter(<Refunds />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });
});

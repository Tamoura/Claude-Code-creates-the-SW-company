import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Analytics from './Analytics';
import * as useAnalyticsModule from '../../hooks/useAnalytics';

vi.mock('../../hooks/useAnalytics');

describe('Analytics', () => {
  const mockUseAnalytics = useAnalyticsModule.useAnalytics as any;

  it('renders page title', () => {
    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [],
      breakdown: [],
      isLoading: false,
      error: null,
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [],
      breakdown: [],
      isLoading: true,
      error: null,
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('displays overview cards with formatted data', () => {
    mockUseAnalytics.mockReturnValue({
      overview: {
        total_payments: 150,
        total_volume: 45000.0,
        successful_payments: 142,
        success_rate: 94.67,
        average_payment: 300.0,
        total_refunds: 3,
        refund_rate: 2.0,
      },
      volume: [],
      breakdown: [],
      isLoading: false,
      error: null,
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);

    expect(screen.getByText('Total Payments')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    expect(screen.getByText('Total Volume')).toBeInTheDocument();
    expect(screen.getByText('$45,000.00')).toBeInTheDocument();

    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('94.7%')).toBeInTheDocument();

    expect(screen.getByText('Average Payment')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
  });

  it('displays volume data section', () => {
    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [
        { date: '2025-01-01', volume: 1200.5, count: 5 },
        { date: '2025-01-02', volume: 2400.0, count: 8 },
      ],
      breakdown: [],
      isLoading: false,
      error: null,
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);

    expect(screen.getByText('Payment Volume')).toBeInTheDocument();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
    expect(screen.getByText('2025-01-02')).toBeInTheDocument();
  });

  it('displays breakdown data section', () => {
    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [],
      breakdown: [
        { label: 'completed', count: 142, volume: 42600.0 },
        { label: 'pending', count: 8, volume: 2400.0 },
      ],
      isLoading: false,
      error: null,
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);

    expect(screen.getByText('Payment Breakdown')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('period selector changes data', () => {
    const mockSetPeriod = vi.fn();

    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [],
      breakdown: [],
      isLoading: false,
      error: null,
      period: 'day',
      setPeriod: mockSetPeriod,
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);

    const weekButton = screen.getByRole('button', { name: /week/i });
    fireEvent.click(weekButton);

    expect(mockSetPeriod).toHaveBeenCalledWith('week');
  });

  it('group by selector changes breakdown', () => {
    const mockSetGroupBy = vi.fn();

    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [],
      breakdown: [],
      isLoading: false,
      error: null,
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: mockSetGroupBy,
    });

    render(<Analytics />);

    const networkButton = screen.getByRole('button', { name: /network/i });
    fireEvent.click(networkButton);

    expect(mockSetGroupBy).toHaveBeenCalledWith('network');
  });

  it('shows error state on API failure', () => {
    mockUseAnalytics.mockReturnValue({
      overview: null,
      volume: [],
      breakdown: [],
      isLoading: false,
      error: 'Failed to load analytics data',
      period: 'day',
      setPeriod: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      groupBy: 'status',
      setGroupBy: vi.fn(),
    });

    render(<Analytics />);

    expect(screen.getByText(/failed to load analytics data/i)).toBeInTheDocument();
  });
});

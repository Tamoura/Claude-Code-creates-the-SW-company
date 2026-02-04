import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import PaymentDetail from './PaymentDetail';
import * as apiClient from '../../lib/api-client';
import type { PaymentSession } from '../../lib/api-client';

// Mock the api-client module
vi.mock('../../lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api-client')>();
  return {
    ...actual,
    apiClient: {
      getPaymentSession: vi.fn(),
    },
  };
});

const mockCompletedPayment: PaymentSession = {
  id: 'ps_test123',
  amount: 100.0,
  currency: 'USD',
  description: 'Test payment for Enterprise plan',
  status: 'completed',
  network: 'ethereum',
  token: 'USDC',
  merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  customer_address: '0x1234567890abcdef1234567890abcdef12345678',
  tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  block_number: 12345678,
  confirmations: 15,
  checkout_url: 'https://example.com/pay/ps_test123',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
  metadata: { order_id: '12345' },
  created_at: '2026-01-28T10:00:00Z',
  expires_at: '2026-02-04T10:00:00Z',
  completed_at: '2026-01-28T10:05:00Z',
};

const mockPendingPayment: PaymentSession = {
  id: 'ps_pending',
  amount: 50.0,
  currency: 'USD',
  description: 'Pending payment',
  status: 'pending',
  network: 'polygon',
  token: 'USDT',
  merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  checkout_url: 'https://example.com/pay/ps_pending',
  created_at: '2026-01-28T11:00:00Z',
  expires_at: '2026-02-04T11:00:00Z',
};

function renderWithRouter(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/payments/${id}`]}>
      <Routes>
        <Route path="/dashboard/payments/:id" element={<PaymentDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PaymentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment details after loading', async () => {
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(mockCompletedPayment);

    renderWithRouter('ps_test123');

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for payment details to load
    await waitFor(() => {
      expect(screen.getByText('ps_test123')).toBeInTheDocument();
    });

    // Check header section
    expect(screen.getByText('$100.00 USD')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();

    // Check payment info
    expect(screen.getByText('Test payment for Enterprise plan')).toBeInTheDocument();
    expect(screen.getByText('ethereum')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();

    // Check blockchain info - using text content match instead of regex for truncated display
    expect(screen.getByText('12345678')).toBeInTheDocument(); // Block number
    expect(screen.getByText('15')).toBeInTheDocument(); // Confirmations

    // Check that transaction hash link exists with correct href (name is "0xabcdef12...567890")
    const txLink = screen.getByRole('link', { name: '0xabcdef12...567890' });
    expect(txLink).toHaveAttribute('href', expect.stringContaining('etherscan.io'));

    // Check addresses exist (exact truncated format from component)
    expect(screen.getByText('0x12345678...345678')).toBeInTheDocument(); // Customer address
    expect(screen.getByText('0x742d35Cc...f0bEb0')).toBeInTheDocument(); // Merchant address
  });

  it('shows error state for not-found payment', async () => {
    const error = new apiClient.ApiClientError(404, 'Not Found', 'Payment session not found');
    vi.mocked(apiClient.apiClient.getPaymentSession).mockRejectedValue(error);

    renderWithRouter('ps_notfound');

    await waitFor(() => {
      expect(screen.getByText(/payment not found/i)).toBeInTheDocument();
    });

    // Should show back buttons (there are 2 in error state)
    expect(screen.getAllByText(/back to payments/i).length).toBeGreaterThanOrEqual(1);
  });

  it('links to correct block explorer based on network', async () => {
    // Test Ethereum
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(mockCompletedPayment);
    const { rerender } = renderWithRouter('ps_test123');

    await waitFor(() => {
      expect(screen.getByText('ps_test123')).toBeInTheDocument();
    });

    // Find link by exact name from truncateAddress function
    const etherscanLink = screen.getByRole('link', { name: '0xabcdef12...567890' });
    expect(etherscanLink).toHaveAttribute(
      'href',
      'https://etherscan.io/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    );

    // Test Polygon
    const polygonPayment: PaymentSession = {
      ...mockCompletedPayment,
      id: 'ps_polygon',
      network: 'polygon',
      tx_hash: '0x9999999999999999999999999999999999999999999999999999999999999999',
    };
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(polygonPayment);

    render(
      <MemoryRouter initialEntries={['/dashboard/payments/ps_polygon']}>
        <Routes>
          <Route path="/dashboard/payments/:id" element={<PaymentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ps_polygon')).toBeInTheDocument();
    });

    const polygonscanLink = screen.getByRole('link', { name: '0x99999999...999999' });
    expect(polygonscanLink).toHaveAttribute(
      'href',
      'https://polygonscan.com/tx/0x9999999999999999999999999999999999999999999999999999999999999999'
    );
  });

  it('copy buttons work for wallet addresses', async () => {
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(mockCompletedPayment);

    // Mock clipboard API on global navigator before rendering
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    renderWithRouter('ps_test123');

    await waitFor(() => {
      expect(screen.getByText('ps_test123')).toBeInTheDocument();
    });

    // Find copy button for customer address by its aria-label
    const customerCopyButton = screen.getByRole('button', { name: 'Copy customer address' });

    // Use fireEvent instead of userEvent for simpler click
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(customerCopyButton);

    // Check clipboard was called with the full address
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(mockCompletedPayment.customer_address);
    }, { timeout: 2000 });
  });

  it('shows loading skeleton initially', () => {
    vi.mocked(apiClient.apiClient.getPaymentSession).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter('ps_test123');

    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('refresh button re-fetches payment data', async () => {
    const getPaymentSessionMock = vi.mocked(apiClient.apiClient.getPaymentSession);
    getPaymentSessionMock.mockResolvedValue(mockPendingPayment);

    const user = userEvent.setup();
    renderWithRouter('ps_pending');

    await waitFor(() => {
      expect(screen.getByText('ps_pending')).toBeInTheDocument();
    });

    expect(getPaymentSessionMock).toHaveBeenCalledTimes(1);

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Should call API again
    await waitFor(() => {
      expect(getPaymentSessionMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows status badges with correct colors', async () => {
    // Test completed status (green)
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(mockCompletedPayment);
    const { rerender } = renderWithRouter('ps_test123');

    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    const completedBadge = screen.getByText('COMPLETED');
    expect(completedBadge).toHaveClass('text-accent-green');

    // Test pending status (yellow)
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(mockPendingPayment);

    render(
      <MemoryRouter initialEntries={['/dashboard/payments/ps_pending']}>
        <Routes>
          <Route path="/dashboard/payments/:id" element={<PaymentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    const pendingBadge = screen.getByText('PENDING');
    expect(pendingBadge).toHaveClass('text-accent-yellow');

    // Test failed status (red)
    const failedPayment: PaymentSession = {
      ...mockPendingPayment,
      id: 'ps_failed',
      status: 'failed',
    };
    vi.mocked(apiClient.apiClient.getPaymentSession).mockResolvedValue(failedPayment);

    render(
      <MemoryRouter initialEntries={['/dashboard/payments/ps_failed']}>
        <Routes>
          <Route path="/dashboard/payments/:id" element={<PaymentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });

    const failedBadge = screen.getByText('FAILED');
    expect(failedBadge).toHaveClass('text-red-400');
  });
});

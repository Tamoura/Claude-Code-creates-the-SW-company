import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MerchantPayments from './MerchantPayments';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    getMerchantPayments: vi.fn(),
  },
}));

const mockGetMerchantPayments = vi.mocked(apiClient.getMerchantPayments);

const renderWithRouter = (merchantId = 'merch_123') => {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/admin/merchants/${merchantId}/payments`]}>
      <Routes>
        <Route path="/dashboard/admin/merchants/:id/payments" element={<MerchantPayments />} />
      </Routes>
    </MemoryRouter>
  );
};

const mockPayments = [
  {
    id: 'pay_abcdef123456789',
    amount: 250,
    currency: 'USD',
    description: 'Test payment',
    status: 'COMPLETED',
    network: 'polygon',
    token: 'USDC',
    merchant_address: '0x1234567890abcdef1234567890abcdef12345678',
    customer_address: '0xabcdef1234567890abcdef1234567890abcdef12',
    tx_hash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    created_at: '2024-03-15T14:30:00Z',
    completed_at: '2024-03-15T14:35:00Z',
  },
  {
    id: 'pay_ghijkl789012345',
    amount: 500,
    currency: 'USD',
    description: null,
    status: 'PENDING',
    network: 'ethereum',
    token: 'USDT',
    merchant_address: '0x1234567890abcdef1234567890abcdef12345678',
    customer_address: null,
    tx_hash: null,
    created_at: '2024-03-16T10:00:00Z',
    completed_at: null,
  },
];

describe('MerchantPayments Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMerchantPayments.mockResolvedValue({
      data: mockPayments,
      pagination: { total: 2, has_more: false, limit: 20, offset: 0 },
    });
  });

  describe('Rendering', () => {
    it('renders page title and back link', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Merchant Payments')).toBeInTheDocument();
      });

      const backLink = screen.getByRole('link', { name: /back to merchants/i });
      expect(backLink).toHaveAttribute('href', '/dashboard/admin/merchants');
    });

    it('displays payment count', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('2 payments')).toBeInTheDocument();
      });
    });

    it('renders payments table with data', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('pay_abcdef12...')).toBeInTheDocument();
      });

      expect(screen.getByText('pay_ghijkl78...')).toBeInTheDocument();
    });

    it('displays formatted amounts', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('$250.00')).toBeInTheDocument();
      });
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });

    it('displays token/network asset info', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('USDC / polygon')).toBeInTheDocument();
      });
      expect(screen.getByText('USDT / ethereum')).toBeInTheDocument();
    });

    it('displays status badges', async () => {
      renderWithRouter();

      await waitFor(() => {
        // Status badges are inside the table rows (not the filter buttons)
        const rows = screen.getAllByRole('row');
        // Row 0 is header, row 1 is first payment (COMPLETED), row 2 is second (PENDING)
        expect(rows[1]).toHaveTextContent('COMPLETED');
        expect(rows[2]).toHaveTextContent('PENDING');
      });
    });

    it('displays truncated tx hash or dash for null', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('0xdeadbeef...')).toBeInTheDocument();
      });
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state while fetching', () => {
      mockGetMerchantPayments.mockReturnValue(new Promise(() => {})); // never resolves
      renderWithRouter();

      expect(screen.getByText('Loading payments...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no payments exist', async () => {
      mockGetMerchantPayments.mockResolvedValue({
        data: [],
        pagination: { total: 0, has_more: false, limit: 20, offset: 0 },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('No payments found')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message on API failure', async () => {
      mockGetMerchantPayments.mockRejectedValue(new Error('Network error'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Back link should still be visible
      expect(screen.getByRole('link', { name: /back to merchants/i })).toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('renders filter buttons for all statuses', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Merchant Payments')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PENDING' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CONFIRMING' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'COMPLETED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FAILED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'REFUNDED' })).toBeInTheDocument();
    });

    it('fetches with status filter when filter button is clicked', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(mockGetMerchantPayments).toHaveBeenCalledWith('merch_123', {
          limit: 20,
          offset: 0,
          status: undefined,
        });
      });

      fireEvent.click(screen.getByRole('button', { name: 'COMPLETED' }));

      await waitFor(() => {
        expect(mockGetMerchantPayments).toHaveBeenCalledWith('merch_123', {
          limit: 20,
          offset: 0,
          status: 'COMPLETED',
        });
      });
    });

    it('resets page to 0 when filter changes', async () => {
      mockGetMerchantPayments.mockResolvedValue({
        data: mockPayments,
        pagination: { total: 25, has_more: true, limit: 20, offset: 0 },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Merchant Payments')).toBeInTheDocument();
      });

      // Go to next page
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(mockGetMerchantPayments).toHaveBeenCalledWith('merch_123', {
          limit: 20,
          offset: 20,
          status: undefined,
        });
      });

      // Change filter — should reset offset to 0
      fireEvent.click(screen.getByRole('button', { name: 'FAILED' }));

      await waitFor(() => {
        expect(mockGetMerchantPayments).toHaveBeenCalledWith('merch_123', {
          limit: 20,
          offset: 0,
          status: 'FAILED',
        });
      });
    });
  });

  describe('Pagination', () => {
    it('disables previous button on first page', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Merchant Payments')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    });

    it('disables next button when no more pages', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Merchant Payments')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('enables next button when more pages exist', async () => {
      mockGetMerchantPayments.mockResolvedValue({
        data: mockPayments,
        pagination: { total: 25, has_more: true, limit: 20, offset: 0 },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
      });
    });

    it('navigates to next page and fetches with updated offset', async () => {
      mockGetMerchantPayments.mockResolvedValue({
        data: mockPayments,
        pagination: { total: 25, has_more: true, limit: 20, offset: 0 },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(mockGetMerchantPayments).toHaveBeenCalledWith('merch_123', {
          limit: 20,
          offset: 20,
          status: undefined,
        });
      });
    });

    it('displays showing count', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/showing 2 of 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls getMerchantPayments with correct merchant ID', async () => {
      renderWithRouter('merch_custom_id');

      await waitFor(() => {
        expect(mockGetMerchantPayments).toHaveBeenCalledWith('merch_custom_id', {
          limit: 20,
          offset: 0,
          status: undefined,
        });
      });
    });
  });
});

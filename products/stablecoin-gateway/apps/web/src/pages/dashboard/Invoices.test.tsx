import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Invoices from './Invoices';
import { apiClient } from '../../lib/api-client';
import * as invoicePdf from '../../lib/invoice-pdf';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    listPaymentSessions: vi.fn(),
  },
}));

// Mock the invoice-pdf module
vi.mock('../../lib/invoice-pdf', () => ({
  generateInvoicePdf: vi.fn(),
  exportAllInvoicesCsv: vi.fn(),
}));

describe('Invoices Page', () => {
  const mockPaymentSessions = [
    {
      id: 'ps_abc123',
      amount: 10000,
      currency: 'USDC',
      status: 'completed',
      customer_address: '0x1234...5678',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:05:00Z',
    },
    {
      id: 'ps_def456',
      amount: 25000,
      currency: 'USDT',
      status: 'completed',
      customer_address: '0xabcd...efgh',
      created_at: '2024-02-01T14:30:00Z',
      updated_at: '2024-02-01T14:35:00Z',
    },
    {
      id: 'ps_ghi789',
      amount: 5000,
      currency: 'USDC',
      status: 'completed',
      customer_address: null,
      created_at: '2024-02-03T08:15:00Z',
      updated_at: '2024-02-03T08:20:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders page title and description', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText(/completed payment invoices generated from your transactions/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('INV-ABC123')).toBeInTheDocument();
      });
    });

    it('renders table headers', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      expect(screen.getByText('Invoice')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });
    });

    it('renders invoices table with data', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        // Check invoice numbers (derived from payment IDs)
        expect(screen.getByText('INV-ABC123')).toBeInTheDocument();
        expect(screen.getByText('INV-DEF456')).toBeInTheDocument();
        expect(screen.getByText('INV-GHI789')).toBeInTheDocument();
      });
    });

    it('displays formatted amounts correctly', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('$10,000.00')).toBeInTheDocument();
      expect(screen.getByText('$25,000.00')).toBeInTheDocument();
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    });

    it('displays dates formatted correctly', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 1, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 3, 2024/)).toBeInTheDocument();
    });

    it('shows customer addresses', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
      expect(screen.getByText('0xabcd...efgh')).toBeInTheDocument();
    });

    it('shows Unknown for missing customer address', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('displays Paid status badges', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });

      const paidBadges = screen.getAllByText('Paid');
      expect(paidBadges).toHaveLength(3);
    });
  });

  describe('Loading State', () => {
    it('shows loading state initially', async () => {
      let resolvePromise: any;
      vi.mocked(apiClient.listPaymentSessions).mockImplementationOnce(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      render(<Invoices />);

      expect(screen.getByText(/loading invoices/i)).toBeInTheDocument();

      // Clean up by resolving
      await waitFor(() => {
        resolvePromise({ data: [] });
      });
    });

    it('hides loading state after data loads', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no invoices exist', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: [],
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.getByText(/no completed payments yet/i)).toBeInTheDocument();
        expect(screen.getByText(/invoices are generated from completed transactions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockRejectedValueOnce(
        new Error('API Error')
      );

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.getByText(/no completed payments yet/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when API fails', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<Invoices />);

      await waitFor(() => {
        // Should show empty state rather than crashing
        expect(screen.getByText(/no completed payments yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Mapping', () => {
    it('correctly maps payment session to invoice format', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: [mockPaymentSessions[0]],
      });

      render(<Invoices />);

      await waitFor(() => {
        // Invoice number should be payment ID with prefix
        expect(screen.getByText('INV-ABC123')).toBeInTheDocument();
        // Amount should be formatted as currency
        expect(screen.getByText('$10,000.00')).toBeInTheDocument();
        // Status should be "Paid" for completed
        expect(screen.getByText('Paid')).toBeInTheDocument();
      });
    });

    it('only fetches completed payment sessions', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(apiClient.listPaymentSessions).toHaveBeenCalledWith({
          status: 'completed',
        });
      });
    });
  });

  describe('PDF Export', () => {
    it('renders Actions column header', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('renders Download PDF button for each invoice', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        const downloadButtons = screen.getAllByText('Download PDF');
        expect(downloadButtons).toHaveLength(3);
      });
    });

    it('calls generateInvoicePdf when Download PDF is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: [mockPaymentSessions[0]],
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
      });

      const downloadButton = screen.getByText('Download PDF');
      await user.click(downloadButton);

      expect(invoicePdf.generateInvoicePdf).toHaveBeenCalledWith({
        id: 'INV-ABC123',
        paymentId: 'ps_abc123',
        amount: '$10,000.00',
        currency: 'USDC',
        status: 'Paid',
        customer: '0x1234...5678',
        date: expect.stringContaining('Jan 15'),
      });
    });

    it('renders Export CSV button when invoices exist', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    it('does not render Export CSV button when no invoices exist', async () => {
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: [],
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.queryByText('Export CSV')).not.toBeInTheDocument();
      });
    });

    it('calls exportAllInvoicesCsv when Export CSV is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.listPaymentSessions).mockResolvedValueOnce({
        data: mockPaymentSessions,
      });

      render(<Invoices />);

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export CSV');
      await user.click(exportButton);

      expect(invoicePdf.exportAllInvoicesCsv).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'INV-ABC123',
            paymentId: 'ps_abc123',
          }),
          expect.objectContaining({
            id: 'INV-DEF456',
            paymentId: 'ps_def456',
          }),
          expect.objectContaining({
            id: 'INV-GHI789',
            paymentId: 'ps_ghi789',
          }),
        ])
      );
    });
  });
});

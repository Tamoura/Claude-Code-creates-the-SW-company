/**
 * Tests for CheckoutSuccess page
 * TDD: Red phase - defining expected behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CheckoutSuccess from './CheckoutSuccess';
import { apiClient } from '../../lib/api-client';
import type { PaymentSession } from '../../lib/api-client';

// Mock the api client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    getCheckoutSession: vi.fn(),
  },
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'ps_test123' }),
  };
});

const mockPayment: PaymentSession = {
  id: 'ps_test123',
  amount: 100.50,
  currency: 'USD',
  description: 'Test payment',
  status: 'completed',
  network: 'polygon',
  token: 'USDC',
  merchant_address: '0x1234567890123456789012345678901234567890',
  customer_address: '0x9876543210987654321098765432109876543210',
  tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  block_number: 12345678,
  confirmations: 15,
  checkout_url: 'http://localhost:3100/pay/ps_test123',
  success_url: 'https://merchant.com/success',
  created_at: '2024-01-15T10:30:00Z',
  expires_at: '2024-01-22T10:30:00Z',
  completed_at: '2024-01-15T10:35:00Z',
};

describe('CheckoutSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders success message with payment details', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockPayment);

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check for success message
    expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();

    // Check for payment amount
    expect(screen.getByText(/\$100\.50/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC/i)).toBeInTheDocument();

    // Check for network
    expect(screen.getByText(/polygon/i)).toBeInTheDocument();
  });

  it('shows block explorer link for transaction hash', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockPayment);

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Should show transaction hash
    const txHashText = screen.getByText(/0xabcdef/i);
    expect(txHashText).toBeInTheDocument();

    // Find link to block explorer
    const links = screen.getAllByRole('link');
    const explorerLink = links.find(link =>
      link.getAttribute('href')?.includes('polygonscan.com')
    );
    expect(explorerLink).toBeInTheDocument();
  });

  it('shows "Return to merchant" button when success_url exists', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockPayment);

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Should show return to merchant button
    const returnButton = screen.getByRole('button', { name: /Return to merchant/i });
    expect(returnButton).toBeInTheDocument();
  });

  it('does not show "Return to merchant" button when success_url is missing', async () => {
    const paymentWithoutSuccessUrl = { ...mockPayment, success_url: undefined };
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(paymentWithoutSuccessUrl);

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Should NOT show return to merchant button
    expect(screen.queryByRole('button', { name: /Return to merchant/i })).not.toBeInTheDocument();
  });

  it('shows receipt section with payment details', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockPayment);

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check for payment ID
    expect(screen.getByText(/ps_test123/i)).toBeInTheDocument();

    // Check for confirmations - should show "15" as text content
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows loading state while fetching payment', () => {
    vi.mocked(apiClient.getCheckoutSession).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows error message when payment not found', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockRejectedValue(
      new Error('Payment not found')
    );

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Use getByRole for heading to be more specific
    expect(screen.getByRole('heading', { name: /Payment Not Found/i })).toBeInTheDocument();
  });

  it('shows green checkmark icon', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockPayment);

    render(
      <BrowserRouter>
        <CheckoutSuccess />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check for SVG with green color class
    const svg = document.querySelector('.text-green-500, .text-green-600');
    expect(svg).toBeInTheDocument();
  });
});

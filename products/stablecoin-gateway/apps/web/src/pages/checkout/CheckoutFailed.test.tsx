/**
 * Tests for CheckoutFailed page
 * TDD: Red phase - defining expected behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CheckoutFailed from './CheckoutFailed';
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

const mockFailedPayment: PaymentSession = {
  id: 'ps_test123',
  amount: 50.00,
  currency: 'USD',
  description: 'Failed test payment',
  status: 'failed',
  network: 'ethereum',
  token: 'USDT',
  merchant_address: '0x1234567890123456789012345678901234567890',
  checkout_url: 'http://localhost:3100/pay/ps_test123',
  created_at: '2024-01-15T10:30:00Z',
  expires_at: '2024-01-22T10:30:00Z',
};

describe('CheckoutFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders failed message', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockFailedPayment);

    render(
      <BrowserRouter>
        <CheckoutFailed />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
  });

  it('"Try Again" links back to payment page', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockFailedPayment);

    render(
      <BrowserRouter>
        <CheckoutFailed />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const tryAgainButton = screen.getByRole('link', { name: /Try Again/i });
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton.getAttribute('href')).toBe('/pay/ps_test123');
  });

  it('shows payment amount and details', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockFailedPayment);

    render(
      <BrowserRouter>
        <CheckoutFailed />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check for amount
    expect(screen.getByText(/\$50\.00/i)).toBeInTheDocument();

    // Check for token
    expect(screen.getByText(/USDT/i)).toBeInTheDocument();

    // Check for network
    expect(screen.getByText(/ethereum/i)).toBeInTheDocument();
  });

  it('shows "Contact merchant" text', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockFailedPayment);

    render(
      <BrowserRouter>
        <CheckoutFailed />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Contact merchant/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching payment', () => {
    vi.mocked(apiClient.getCheckoutSession).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <CheckoutFailed />
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
        <CheckoutFailed />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Use getByRole for heading to be more specific
    expect(screen.getByRole('heading', { name: /Payment Not Found/i })).toBeInTheDocument();
  });

  it('shows red X icon', async () => {
    vi.mocked(apiClient.getCheckoutSession).mockResolvedValue(mockFailedPayment);

    render(
      <BrowserRouter>
        <CheckoutFailed />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check for SVG with red color class
    const svg = document.querySelector('.text-red-500, .text-red-600');
    expect(svg).toBeInTheDocument();
  });
});

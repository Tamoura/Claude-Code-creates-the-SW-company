import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreatePaymentLink from './CreatePaymentLink';
import * as apiClientModule from '../../lib/api-client';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    createPaymentSession: vi.fn(),
    convertCurrency: vi.fn().mockResolvedValue({
      amount: 100,
      from: 'EUR',
      to: 'USD',
      converted_amount: 108.70,
      rate: 0.92,
    }),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

const renderCreatePaymentLink = () => {
  return render(
    <BrowserRouter>
      <CreatePaymentLink />
    </BrowserRouter>
  );
};

describe('CreatePaymentLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with all fields', () => {
    renderCreatePaymentLink();

    expect(screen.getByText('Create Payment Link')).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/network/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/success url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cancel url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate link/i })).toBeInTheDocument();
  });

  it('validates amount is required', async () => {
    renderCreatePaymentLink();

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
  });

  it('validates amount must be greater than 0', async () => {
    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '0' } });

    // Verify the input value changed
    expect(amountInput.value).toBe('0');

    const generateButton = screen.getByRole('button', { name: /generate link/i });

    // Submit the form (button click should trigger form submit)
    fireEvent.submit(generateButton.closest('form')!);

    // Wait for error message to appear
    const errorMessage = await screen.findByText(/amount must be greater than 0/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('shows generated link after successful creation', async () => {
    const mockSession = {
      id: 'ps_test123',
      amount: 100,
      currency: 'USD',
      status: 'pending',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      checkout_url: 'http://localhost:3100/pay/ps_test123',
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-01-08T00:00:00Z',
    };

    vi.mocked(apiClientModule.apiClient.createPaymentSession).mockResolvedValue(mockSession);

    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/payment link created/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('http://localhost:3100/pay/ps_test123')).toBeInTheDocument();
      expect(screen.getByText(/ps_test123/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create another/i })).toBeInTheDocument();
    });
  });

  it('copy button copies to clipboard', async () => {
    const mockSession = {
      id: 'ps_test123',
      amount: 100,
      currency: 'USD',
      status: 'pending',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      checkout_url: 'http://localhost:3100/pay/ps_test123',
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-01-08T00:00:00Z',
    };

    vi.mocked(apiClientModule.apiClient.createPaymentSession).mockResolvedValue(mockSession);

    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3100/pay/ps_test123');
      expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    });
  });

  it('"Create Another" button resets the form', async () => {
    const mockSession = {
      id: 'ps_test123',
      amount: 100,
      currency: 'USD',
      status: 'pending',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      checkout_url: 'http://localhost:3100/pay/ps_test123',
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-01-08T00:00:00Z',
    };

    vi.mocked(apiClientModule.apiClient.createPaymentSession).mockResolvedValue(mockSession);

    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '100' } });

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create another/i })).toBeInTheDocument();
    });

    const createAnotherButton = screen.getByRole('button', { name: /create another/i });
    fireEvent.click(createAnotherButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate link/i })).toBeInTheDocument();
    });

    // Get a fresh reference to the input after the form resets
    const resetAmountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(resetAmountInput.value).toBe('');
  });

  it('renders currency selector with USD, EUR, GBP options', () => {
    renderCreatePaymentLink();

    const currencySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(currencySelect).toBeInTheDocument();
    expect(currencySelect.value).toBe('USD');

    const options = Array.from(currencySelect.options).map((o) => o.value);
    expect(options).toEqual(['USD', 'EUR', 'GBP']);
  });

  it('passes selected currency to API on submission', async () => {
    const mockSession = {
      id: 'ps_eur_test',
      amount: 108.70,
      currency: 'USD',
      status: 'pending',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      checkout_url: 'http://localhost:3100/pay/ps_eur_test',
      original_amount: 100,
      original_currency: 'EUR',
      exchange_rate: 0.92,
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-01-08T00:00:00Z',
    };

    vi.mocked(apiClientModule.apiClient.createPaymentSession).mockResolvedValue(mockSession);

    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const currencySelect = screen.getByRole('combobox');
    fireEvent.change(currencySelect, { target: { value: 'EUR' } });

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiClientModule.apiClient.createPaymentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          currency: 'EUR',
        })
      );
    });
  });

  it('shows USD preview when non-USD currency is selected', async () => {
    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const currencySelect = screen.getByRole('combobox');
    fireEvent.change(currencySelect, { target: { value: 'EUR' } });

    await waitFor(() => {
      expect(screen.getByText(/≈ \$108\.70 USD/)).toBeInTheDocument();
    });
  });

  it('displays API errors', async () => {
    vi.mocked(apiClientModule.apiClient.createPaymentSession).mockRejectedValue({
      detail: 'Invalid merchant address',
    });

    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid merchant address/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while creating', async () => {
    const mockSession = {
      id: 'ps_test123',
      amount: 100,
      currency: 'USD',
      status: 'pending',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      checkout_url: 'http://localhost:3100/pay/ps_test123',
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-01-08T00:00:00Z',
    };

    let resolvePromise: (value: typeof mockSession) => void;
    const promise = new Promise<typeof mockSession>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(apiClientModule.apiClient.createPaymentSession).mockReturnValue(promise);

    renderCreatePaymentLink();

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const generateButton = screen.getByRole('button', { name: /generate link/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    });

    resolvePromise!(mockSession);

    await waitFor(() => {
      expect(screen.getByText(/payment link created/i)).toBeInTheDocument();
    });
  });
});

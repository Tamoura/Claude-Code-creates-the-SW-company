import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the main heading', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', { name: 'Stablecoin Gateway' })
    ).toBeInTheDocument();
  });

  it('renders the tagline text', () => {
    renderHomePage();

    expect(
      screen.getByText(
        'Accept USDC/USDT payments with 0.5% fees. Get paid in 5 minutes.'
      )
    ).toBeInTheDocument();
  });

  it('renders the payment form with amount input and submit button', () => {
    renderHomePage();

    expect(screen.getByLabelText('Amount (USD)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate Payment Link' })
    ).toBeInTheDocument();
  });

  it('renders feature highlight sections', () => {
    renderHomePage();

    expect(screen.getByText('Low Fees')).toBeInTheDocument();
    expect(screen.getByText('Only 0.5% per transaction')).toBeInTheDocument();
    expect(screen.getByText('Fast Settlement')).toBeInTheDocument();
    expect(screen.getByText('Get paid in 5 minutes')).toBeInTheDocument();
    expect(screen.getByText('Stablecoin Only')).toBeInTheDocument();
    expect(screen.getByText('No crypto volatility')).toBeInTheDocument();
  });

  it('generates a payment link after submitting a valid amount', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByLabelText('Amount (USD)');
    await user.type(input, '50');

    const submitButton = screen.getByRole('button', {
      name: 'Generate Payment Link',
    });
    await user.click(submitButton);

    expect(
      await screen.findByText('Payment Link Created!')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy Link' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View Payment Page' })
    ).toBeInTheDocument();
  });
});

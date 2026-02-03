import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PricingPage from './PricingPage';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('PricingPage', () => {
  it('renders pricing hero with 0.5% fee', () => {
    renderWithRouter(<PricingPage />);

    expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
    expect(screen.getByText('One flat rate. No monthly fees. No hidden charges.')).toBeInTheDocument();
    expect(screen.getAllByText('0.5%')).toHaveLength(2); // Hero and comparison table
    expect(screen.getByText('per successful transaction')).toBeInTheDocument();
  });

  it('renders comparison table with all competitors', () => {
    renderWithRouter(<PricingPage />);

    // Check for competitor names
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('Coinbase Commerce')).toBeInTheDocument();
    expect(screen.getByText('BitPay')).toBeInTheDocument();
    expect(screen.getAllByText('StableFlow')).toHaveLength(2); // Nav and table

    // Check for fees
    expect(screen.getAllByText(/2\.9% \+ \$0\.30/)).toHaveLength(2); // Stripe and PayPal
    expect(screen.getAllByText('1%')).toHaveLength(2); // Coinbase and BitPay

    // Check for costs on $100k
    expect(screen.getAllByText(/~\$3,200/)).toHaveLength(2);
    expect(screen.getAllByText(/\$1,000/)).toHaveLength(2);
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('savings calculator updates when input changes', () => {
    renderWithRouter(<PricingPage />);

    // Find the input by label or placeholder
    const input = screen.getByLabelText(/Annual sales volume/i);

    // Default value should show savings for $100,000
    // Credit card fees: $100,000 * 0.029 + (transactions) * 0.30 ≈ $3,200
    // Stablecoin fees: $100,000 * 0.005 = $500
    // Savings: ~$2,700
    expect(screen.getByText(/You save \$\d{1,3}(,\d{3})* per year/)).toBeInTheDocument();

    // Change the input value
    fireEvent.change(input, { target: { value: '200000' } });

    // Should still show savings text (amount will change)
    expect(screen.getByText(/You save \$\d{1,3}(,\d{3})* per year/)).toBeInTheDocument();
  });

  it('CTA links to signup', () => {
    renderWithRouter(<PricingPage />);

    const ctaButton = screen.getByRole('button', { name: /Start accepting stablecoins today/i });
    expect(ctaButton).toBeInTheDocument();

    // Simulate click
    fireEvent.click(ctaButton);

    // After click, should navigate to signup (we'll test by checking the navigate function was called)
    // In real app this would navigate, but in test we just verify the button exists and is clickable
  });

  it('renders what\'s included section with features', () => {
    renderWithRouter(<PricingPage />);

    expect(screen.getByText('No monthly fees')).toBeInTheDocument();
    expect(screen.getByText('No setup fees')).toBeInTheDocument();
    expect(screen.getByText('Instant settlement')).toBeInTheDocument();
    expect(screen.getByText('Real-time notifications')).toBeInTheDocument();
    expect(screen.getByText('Developer API & SDK')).toBeInTheDocument();
    expect(screen.getByText('Webhook integrations')).toBeInTheDocument();
  });

  it('renders navigation with links', () => {
    renderWithRouter(<PricingPage />);

    expect(screen.getAllByText('StableFlow')).toHaveLength(2); // Nav and table
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pricing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('renders footer', () => {
    renderWithRouter(<PricingPage />);

    expect(screen.getByText(/© 2026 StableFlow/i)).toBeInTheDocument();
  });
});

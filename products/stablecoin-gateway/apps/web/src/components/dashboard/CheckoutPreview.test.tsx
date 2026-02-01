import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CheckoutPreview from './CheckoutPreview';

describe('CheckoutPreview', () => {
  it('renders the section heading', () => {
    render(<CheckoutPreview />);

    expect(
      screen.getByRole('heading', { name: /live checkout preview/i })
    ).toBeInTheDocument();
  });

  it('renders product name and price', () => {
    render(<CheckoutPreview />);

    expect(
      screen.getByRole('heading', { name: 'Pro Analytics Plan' })
    ).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('renders the Pay with Stablecoin button', () => {
    render(<CheckoutPreview />);

    expect(
      screen.getByRole('button', { name: /pay with stablecoin/i })
    ).toBeInTheDocument();
  });

  it('renders product description', () => {
    render(<CheckoutPreview />);

    expect(
      screen.getByText(/real-time crypto analytics/i)
    ).toBeInTheDocument();
  });
});

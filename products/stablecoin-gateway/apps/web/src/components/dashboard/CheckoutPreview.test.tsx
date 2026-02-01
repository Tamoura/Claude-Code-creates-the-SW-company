import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock the api-client module before importing the component
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    createPaymentSession: vi.fn(),
  },
}));

import CheckoutPreview from './CheckoutPreview';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CheckoutPreview', () => {
  it('renders the section heading', () => {
    renderWithRouter(<CheckoutPreview />);

    expect(
      screen.getByRole('heading', { name: /live checkout preview/i })
    ).toBeInTheDocument();
  });

  it('renders product name and price', () => {
    renderWithRouter(<CheckoutPreview />);

    expect(
      screen.getByRole('heading', { name: 'Pro Analytics Plan' })
    ).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('renders the Simulate Payment button', () => {
    renderWithRouter(<CheckoutPreview />);

    expect(
      screen.getByRole('button', { name: /simulate payment/i })
    ).toBeInTheDocument();
  });

  it('renders product description', () => {
    renderWithRouter(<CheckoutPreview />);

    expect(
      screen.getByText(/real-time crypto analytics/i)
    ).toBeInTheDocument();
  });
});

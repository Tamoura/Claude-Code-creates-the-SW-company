import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import QuickStart from './QuickStart';

function renderQuickStart() {
  return render(
    <MemoryRouter>
      <QuickStart />
    </MemoryRouter>
  );
}

describe('QuickStart', () => {
  it('renders quick start guide heading', () => {
    renderQuickStart();

    expect(screen.getByRole('heading', { name: /quick start guide/i })).toBeInTheDocument();
  });

  it('renders all quick start steps', () => {
    renderQuickStart();

    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
    expect(screen.getByText(/get your api key/i)).toBeInTheDocument();
    expect(screen.getByText(/install the sdk/i)).toBeInTheDocument();
    expect(screen.getByText(/create a payment session/i)).toBeInTheDocument();
    expect(screen.getByText(/handle webhooks/i)).toBeInTheDocument();
  });

  it('contains code examples', () => {
    renderQuickStart();

    // Check for npm install command
    expect(screen.getByText(/npm install @stablecoin-gateway\/sdk/)).toBeInTheDocument();

    // Check for import statement
    expect(screen.getByText(/import.*StablecoinGateway.*from/)).toBeInTheDocument();

    // Check for code example structure
    expect(screen.getByText(/createPaymentSession/)).toBeInTheDocument();
  });

  it('has link to signup page', () => {
    renderQuickStart();

    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('has link to webhook documentation', () => {
    renderQuickStart();

    const webhookLink = screen.getByRole('link', { name: /webhook docs/i });
    expect(webhookLink).toHaveAttribute('href', '/docs/webhooks');
  });
});

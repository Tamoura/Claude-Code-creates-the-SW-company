import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicFooter from './PublicFooter';

describe('PublicFooter', () => {
  it('renders copyright text', () => {
    render(<PublicFooter />);

    expect(screen.getByText(/© 2026 StableFlow/i)).toBeInTheDocument();
  });

  it('renders stablecoin payment infrastructure text', () => {
    render(<PublicFooter />);

    expect(screen.getByText(/Stablecoin Payment Infrastructure/i)).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<PublicFooter />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('border-t', 'border-card-border');
  });
});

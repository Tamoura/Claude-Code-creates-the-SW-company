import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TopHeader from './TopHeader';

describe('TopHeader', () => {
  it('renders the page title', () => {
    render(<TopHeader title="Dashboard" />);

    expect(
      screen.getByRole('heading', { name: 'Dashboard', level: 1 })
    ).toBeInTheDocument();
  });

  it('renders Simulate Payment button', () => {
    render(<TopHeader title="Payments" />);

    expect(
      screen.getByRole('button', { name: /simulate payment/i })
    ).toBeInTheDocument();
  });

  it('renders user avatar with initials', () => {
    render(<TopHeader title="Dashboard" />);

    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders different titles based on prop', () => {
    const { rerender } = render(<TopHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Dashboard'
    );

    rerender(<TopHeader title="Settings" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Settings'
    );
  });
});

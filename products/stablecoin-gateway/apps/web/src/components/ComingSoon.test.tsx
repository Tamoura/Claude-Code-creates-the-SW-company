import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ComingSoon from './ComingSoon';

describe('ComingSoon', () => {
  it('renders the title', () => {
    render(<ComingSoon title="Wallet Integration" />);

    expect(
      screen.getByRole('heading', { name: 'Wallet Integration' })
    ).toBeInTheDocument();
  });

  it('renders a custom description when provided', () => {
    render(
      <ComingSoon
        title="Analytics"
        description="Advanced analytics are on the way."
      />
    );

    expect(
      screen.getByText('Advanced analytics are on the way.')
    ).toBeInTheDocument();
  });

  it('renders default description when none is provided', () => {
    render(<ComingSoon title="Notifications" />);

    expect(
      screen.getByText(
        "We're working on this feature. Check back soon!"
      )
    ).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Balance" value="$124,592.00" />);

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('$124,592.00')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(
      <StatCard title="Volume" value="$89,240.50" trend="+4.2% this week" />
    );

    expect(screen.getByText('+4.2% this week')).toBeInTheDocument();
  });

  it('does not render trend when not provided', () => {
    render(<StatCard title="Success Rate" value="99.8%" />);

    expect(screen.queryByText(/this week/)).not.toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <StatCard
        title="Success Rate"
        value="99.8%"
        subtitle="Stable over 30 days"
      />
    );

    expect(screen.getByText('Stable over 30 days')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(
      <StatCard title="Balance" value="$100" trend="+5%" />
    );

    // Should have title, value, trend — but no subtitle element
    const texts = container.querySelectorAll('.text-sm.text-text-secondary');
    // Only the title should match, not a subtitle
    expect(texts).toHaveLength(1);
  });
});

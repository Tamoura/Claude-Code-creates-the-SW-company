import { render, screen } from '@testing-library/react';
import StatCard from '../src/components/dashboard/StatCard';

describe('StatCard', () => {
  it('renders the title and value', () => {
    render(<StatCard title="PRs Merged" value="24" />);
    expect(screen.getByText('PRs Merged')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(<StatCard title="PRs Merged" value="24" trend="+12% vs last week" />);
    expect(screen.getByText('+12% vs last week')).toBeInTheDocument();
  });

  it('does not render trend when not provided', () => {
    render(<StatCard title="PRs Merged" value="24" />);
    expect(screen.queryByText(/vs last week/)).not.toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard title="Review Time" value="4.2h" subtitle="Median time to first review" />);
    expect(screen.getByText('Median time to first review')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<StatCard title="PRs Merged" value="24" />);
    expect(screen.queryByText(/median/i)).not.toBeInTheDocument();
  });
});

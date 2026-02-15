import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders "Draft" label for draft status', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders "In Review" label for review status', () => {
    render(<StatusBadge status="review" />);
    expect(screen.getByText('In Review')).toBeInTheDocument();
  });

  it('renders "Approved" label for approved status', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders "Published" label for published status', () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders "Archived" label for archived status', () => {
    render(<StatusBadge status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders "Unknown" fallback label for unrecognized status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders "Unknown" fallback for empty string status', () => {
    render(<StatusBadge status="" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('wraps label in a span with badge styling', () => {
    render(<StatusBadge status="draft" />);
    const badge = screen.getByText('Draft');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
  });
});

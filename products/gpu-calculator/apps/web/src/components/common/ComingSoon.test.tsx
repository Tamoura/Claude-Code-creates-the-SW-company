import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('renders title and description', () => {
    render(
      <ComingSoon
        title="Feature Name"
        description="This feature is currently in development."
      />
    );

    expect(screen.getByText('Feature Name')).toBeInTheDocument();
    expect(screen.getByText('This feature is currently in development.')).toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    render(<ComingSoon title="Feature Name" />);

    expect(screen.getByText('Feature Name')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <ComingSoon title="Feature Name" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <ComingSoon
        title="Feature Name"
        description="Coming soon description"
      />
    );

    const heading = screen.getByRole('heading', { name: 'Feature Name' });
    expect(heading).toBeInTheDocument();
  });
});

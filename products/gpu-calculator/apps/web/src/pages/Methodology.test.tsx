import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Methodology } from './Methodology';

describe('Methodology', () => {
  it('renders the page heading', () => {
    render(<Methodology />);
    expect(screen.getByRole('heading', { name: /methodology/i, level: 1 })).toBeInTheDocument();
  });

  it('displays coming soon message', () => {
    render(<Methodology />);
    expect(screen.getByText(/how calculations work/i)).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    const { container } = render(<Methodology />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { About } from './About';

describe('About', () => {
  it('renders the page heading', () => {
    render(<About />);
    expect(screen.getByRole('heading', { name: /about/i, level: 1 })).toBeInTheDocument();
  });

  it('displays coming soon message', () => {
    render(<About />);
    expect(screen.getByText(/about this calculator/i)).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    const { container } = render(<About />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});

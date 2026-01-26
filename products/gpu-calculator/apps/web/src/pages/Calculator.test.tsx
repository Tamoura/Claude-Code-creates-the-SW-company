import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Calculator } from './Calculator';

describe('Calculator', () => {
  it('renders the tabs for training and inference', () => {
    render(<Calculator />);
    expect(screen.getByRole('tab', { name: /training/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /inference/i })).toBeInTheDocument();
  });

  it('renders the training form by default', () => {
    render(<Calculator />);
    expect(screen.getByLabelText(/model size/i)).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    const { container } = render(<Calculator />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});

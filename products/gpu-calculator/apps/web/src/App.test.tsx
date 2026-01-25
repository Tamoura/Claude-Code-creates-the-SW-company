import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the header with title', () => {
    render(<App />);
    expect(screen.getByText('AI GPU Usage Calculator')).toBeInTheDocument();
  });

  it('renders all tab options', () => {
    render(<App />);
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Inference')).toBeInTheDocument();
  });

  it('displays training form by default', () => {
    render(<App />);
    expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    expect(screen.getByText('GPU Configuration')).toBeInTheDocument();
  });
});

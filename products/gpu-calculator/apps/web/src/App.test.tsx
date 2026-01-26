import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the header with title', () => {
    render(<App />);
    expect(screen.getByText('AI GPU Usage Calculator')).toBeInTheDocument();
  });

  it('renders navigation links in header', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calculator' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Methodology' })).toHaveLength(2); // Header + Footer
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
  });

  it('displays calculator page by default', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Training' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Inference' })).toBeInTheDocument();
  });

  it('displays training form by default', () => {
    render(<App />);
    expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    expect(screen.getByText('GPU Configuration')).toBeInTheDocument();
  });
});

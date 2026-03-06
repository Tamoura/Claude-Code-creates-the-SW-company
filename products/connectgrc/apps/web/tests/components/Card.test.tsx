import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '../../src/components/ui/Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default medium padding', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-6');
  });

  it('applies small padding when specified', () => {
    const { container } = render(<Card padding="sm">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-4');
  });

  it('applies large padding when specified', () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-8');
  });

  it('applies base styles including border and shadow', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('shadow-sm');
    expect(card.className).toContain('border');
  });

  it('passes additional className', () => {
    const { container } = render(<Card className="mt-4">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('mt-4');
  });

  it('passes through HTML div attributes', () => {
    render(<Card data-testid="test-card">Content</Card>);
    expect(screen.getByTestId('test-card')).toBeInTheDocument();
  });
});

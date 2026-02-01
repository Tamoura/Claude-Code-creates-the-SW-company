import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders with text content', () => {
    render(<Badge>DRAFT</Badge>);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('applies draft variant styling by default', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('applies sent variant styling', () => {
    render(<Badge variant="sent">SENT</Badge>);
    const badge = screen.getByText('SENT');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('applies paid variant styling', () => {
    render(<Badge variant="paid">PAID</Badge>);
    const badge = screen.getByText('PAID');
    expect(badge.className).toContain('bg-green-100');
  });

  it('applies overdue variant styling', () => {
    render(<Badge variant="overdue">OVERDUE</Badge>);
    const badge = screen.getByText('OVERDUE');
    expect(badge.className).toContain('bg-red-100');
  });

  it('applies success variant styling', () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge.className).toContain('bg-green-100');
  });

  it('accepts custom className', () => {
    render(<Badge className="ml-2">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('ml-2');
  });

  it('includes base badge styling', () => {
    render(<Badge>Base</Badge>);
    const badge = screen.getByText('Base');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('font-semibold');
  });
});

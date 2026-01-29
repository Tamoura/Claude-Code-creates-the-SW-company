import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import References, { Reference } from './References';
import '../../../src/i18n/i18n';

describe('References', () => {
  const mockReferences: Reference[] = [
    {
      id: 1,
      title: "Test Article Title",
      source: "Test Journal",
      date: "2026",
      url: "https://example.com/test",
      accessDate: "2026-01-27"
    },
    {
      id: 2,
      authors: "Smith, J.",
      title: "Another Test Article",
      source: "Another Journal",
      url: "https://example.com/test2",
      accessDate: "2026-01-27"
    }
  ];

  it('renders references section', () => {
    render(
      <BrowserRouter>
        <References references={mockReferences} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /references/i })).toBeInTheDocument();
  });

  it('renders all references with correct numbering', () => {
    render(
      <BrowserRouter>
        <References references={mockReferences} />
      </BrowserRouter>
    );

    expect(screen.getByText('[1]')).toBeInTheDocument();
    expect(screen.getByText('[2]')).toBeInTheDocument();
  });

  it('renders reference titles', () => {
    render(
      <BrowserRouter>
        <References references={mockReferences} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText('Another Test Article')).toBeInTheDocument();
  });

  it('renders reference URLs as links', () => {
    render(
      <BrowserRouter>
        <References references={mockReferences} />
      </BrowserRouter>
    );

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/test');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders authors when provided', () => {
    render(
      <BrowserRouter>
        <References references={mockReferences} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Smith, J\./)).toBeInTheDocument();
  });

  it('renders access dates', () => {
    render(
      <BrowserRouter>
        <References references={mockReferences} />
      </BrowserRouter>
    );

    const accessDateElements = screen.getAllByText(/accessed 2026-01-27/);
    expect(accessDateElements).toHaveLength(2);
  });

  it('renders empty list when no references provided', () => {
    render(
      <BrowserRouter>
        <References references={[]} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /references/i })).toBeInTheDocument();
    const listItems = screen.queryAllByRole('listitem');
    expect(listItems).toHaveLength(0);
  });
});

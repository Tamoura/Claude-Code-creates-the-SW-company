import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import DocsLayout from './DocsLayout';

function renderDocsLayout(initialRoute = '/docs/quickstart') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <DocsLayout />
    </MemoryRouter>
  );
}

describe('DocsLayout', () => {
  it('renders the StableFlow brand', () => {
    renderDocsLayout();

    expect(screen.getByText('StableFlow')).toBeInTheDocument();
  });

  it('renders navigation links in header', () => {
    renderDocsLayout();

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders sidebar navigation with all doc links', () => {
    renderDocsLayout();

    expect(screen.getByRole('link', { name: /quick start/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /api reference/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /webhooks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sdk/i })).toBeInTheDocument();
  });

  it('sidebar links point to correct routes', () => {
    renderDocsLayout();

    expect(screen.getByRole('link', { name: /quick start/i })).toHaveAttribute(
      'href',
      '/docs/quickstart'
    );
    expect(screen.getByRole('link', { name: /api reference/i })).toHaveAttribute(
      'href',
      '/docs/api-reference'
    );
    expect(screen.getByRole('link', { name: /webhooks/i })).toHaveAttribute(
      'href',
      '/docs/webhooks'
    );
    expect(screen.getByRole('link', { name: /sdk/i })).toHaveAttribute(
      'href',
      '/docs/sdk'
    );
  });

  it('renders outlet content area', () => {
    renderDocsLayout();

    // The Outlet component will render children, check for content container
    const contentArea = screen.getByTestId('docs-content');
    expect(contentArea).toBeInTheDocument();
  });
});

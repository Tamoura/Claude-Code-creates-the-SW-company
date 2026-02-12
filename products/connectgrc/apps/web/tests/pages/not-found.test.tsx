import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '../../src/app/not-found';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Not Found Page', () => {
  it('renders the 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders the page not found message', () => {
    render(<NotFound />);
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders a link back to home', () => {
    render(<NotFound />);
    const homeLink = screen.getByText('Go Home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});

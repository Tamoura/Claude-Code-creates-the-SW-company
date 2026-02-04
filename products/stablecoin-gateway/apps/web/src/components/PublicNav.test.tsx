import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PublicNav from './PublicNav';

const renderWithRouter = (component: React.ReactElement, initialPath = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      {component}
    </MemoryRouter>
  );
};

describe('PublicNav', () => {
  it('renders logo and brand name', () => {
    renderWithRouter(<PublicNav />);

    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('StableFlow')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter(<PublicNav />);

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument();
  });

  it('renders auth buttons', () => {
    renderWithRouter(<PublicNav />);

    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('highlights active page (Home)', () => {
    renderWithRouter(<PublicNav />, '/');

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveClass('text-accent-pink');
  });

  it('highlights active page (Pricing)', () => {
    renderWithRouter(<PublicNav />, '/pricing');

    const pricingLink = screen.getByRole('link', { name: 'Pricing' });
    expect(pricingLink).toHaveClass('text-accent-pink');
  });
});

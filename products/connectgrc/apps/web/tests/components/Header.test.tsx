import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../../src/components/layout/Header';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Header', () => {
  it('renders the ConnectGRC brand name', () => {
    render(<Header />);
    expect(screen.getByText('ConnectGRC')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Header />);
    expect(screen.getByText('For Talents')).toBeInTheDocument();
    expect(screen.getByText('For Employers')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('renders sign in and get started buttons', () => {
    render(<Header />);
    // Multiple instances: desktop and mobile
    const signInLinks = screen.getAllByText('Sign In');
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    const getStartedLinks = screen.getAllByText('Get Started');
    expect(getStartedLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('has a mobile menu toggle button', () => {
    render(<Header />);
    const toggle = screen.getByLabelText('Toggle menu');
    expect(toggle).toBeInTheDocument();
  });
});

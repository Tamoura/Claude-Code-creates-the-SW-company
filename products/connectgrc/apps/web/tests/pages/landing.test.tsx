import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingPage from '../../src/app/(public)/page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Landing Page', () => {
  it('renders the hero heading', () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/Advance Your GRC Career/i)
    ).toBeInTheDocument();
  });

  it('renders the hero description', () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/first AI-native talent platform/i)
    ).toBeInTheDocument();
  });

  it('renders the Get Started Free CTA', () => {
    render(<LandingPage />);
    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    render(<LandingPage />);
    expect(screen.getByText('AI-Powered Assessments')).toBeInTheDocument();
    expect(screen.getByText('Career Simulator')).toBeInTheDocument();
    expect(screen.getByText('Professional Tiering')).toBeInTheDocument();
    expect(screen.getByText('Resource Hub')).toBeInTheDocument();
  });

  it('renders the bottom CTA section', () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/Ready to Take Your GRC Career Further/i)
    ).toBeInTheDocument();
  });
});

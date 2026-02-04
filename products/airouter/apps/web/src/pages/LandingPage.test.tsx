import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

function renderWithRouter() {
  return render(
    <BrowserRouter>
      <LandingPage />
    </BrowserRouter>
  );
}

describe('LandingPage', () => {
  it('renders the hero heading', () => {
    renderWithRouter();

    expect(screen.getByText('Free AI APIs,')).toBeInTheDocument();
    expect(screen.getByText('One Endpoint')).toBeInTheDocument();
  });

  it('renders the hero description', () => {
    renderWithRouter();

    expect(
      screen.getByText(/route ai requests across free-tier providers/i)
    ).toBeInTheDocument();
  });

  it('renders the Get Started CTA', () => {
    renderWithRouter();

    const ctaLinks = screen.getAllByText('Get Started');
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  it('renders all four value propositions', () => {
    renderWithRouter();

    expect(screen.getByText('Bring Your Own Keys')).toBeInTheDocument();
    expect(screen.getByText('Smart Routing')).toBeInTheDocument();
    expect(screen.getByText('Automatic Failover')).toBeInTheDocument();
    expect(screen.getByText('Zero Cost')).toBeInTheDocument();
  });

  it('renders the How It Works section with 3 steps', () => {
    renderWithRouter();

    const howItWorks = screen.getAllByText('How It Works');
    expect(howItWorks.length).toBeGreaterThan(0);
    expect(screen.getByText('Add Your Keys')).toBeInTheDocument();
    expect(screen.getByText('Route Requests')).toBeInTheDocument();
    expect(screen.getByText('Track Usage')).toBeInTheDocument();
  });

  it('renders supported providers section', () => {
    renderWithRouter();

    expect(screen.getByText('Supported Providers')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
  });

  it('renders Sign Up and Log In navigation links', () => {
    renderWithRouter();

    expect(screen.getByText('Log In')).toBeInTheDocument();
    // Multiple Sign Up links (nav + CTAs)
    const signUpLinks = screen.getAllByText(/sign up/i);
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it('renders the code snippet', () => {
    renderWithRouter();

    expect(
      screen.getByText(/api\.airouter\.dev\/v1\/chat\/completions/i)
    ).toBeInTheDocument();
  });
});

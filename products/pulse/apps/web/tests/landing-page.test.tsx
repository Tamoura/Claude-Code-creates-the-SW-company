import { render, screen } from '@testing-library/react';
import LandingPage from '../src/app/page';

describe('Landing Page', () => {
  it('renders the hero section with Pulse branding', () => {
    render(<LandingPage />);
    expect(screen.getByText(/your engineering team's daily/i)).toBeInTheDocument();
    expect(screen.getByText('pulse')).toBeInTheDocument();
  });

  it('renders the feature highlights', () => {
    render(<LandingPage />);
    expect(screen.getByText('Team Velocity')).toBeInTheDocument();
    expect(screen.getByText('Code Quality')).toBeInTheDocument();
    expect(screen.getByText('AI Sprint Risk')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Feed')).toBeInTheDocument();
    expect(screen.getByText('GitHub Integration')).toBeInTheDocument();
    expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
  });

  it('renders CTA buttons linking to signup', () => {
    render(<LandingPage />);
    const ctaButtons = screen.getAllByRole('link', { name: /get started|start free/i });
    expect(ctaButtons.length).toBeGreaterThanOrEqual(2);
    ctaButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('href', '/signup');
    });
  });

  it('renders navigation links', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /pricing/i })).toHaveAttribute('href', '/pricing');
    // "Docs" link in header nav (there's also "View Docs" in hero)
    const docsLinks = screen.getAllByRole('link', { name: /docs/i });
    expect(docsLinks.some((l) => l.getAttribute('href') === '/docs')).toBe(true);
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
  });

  it('renders the footer', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Pulse by ConnectSW/)).toBeInTheDocument();
  });
});

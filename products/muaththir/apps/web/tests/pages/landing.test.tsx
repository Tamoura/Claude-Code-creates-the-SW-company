import { render, screen } from '@testing-library/react';
import LandingPage from '../../src/app/page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Landing Page', () => {
  it('renders the hero heading', () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/Nurture every dimension/)
    ).toBeInTheDocument();
    // "of your child" appears in multiple places (hero + CTA)
    expect(screen.getAllByText(/of your child/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all six dimension names', () => {
    render(<LandingPage />);
    expect(screen.getAllByText('Academic').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Social-Emotional').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Behavioural').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Aspirational').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Islamic').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Physical').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the how-it-works steps', () => {
    render(<LandingPage />);
    expect(screen.getByText('Observe')).toBeInTheDocument();
    expect(screen.getByText('Track')).toBeInTheDocument();
    expect(screen.getByText('Grow')).toBeInTheDocument();
  });

  it('renders signup CTA links', () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByText(/Start Tracking Free|Get Started Free/);
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the brand name in the header', () => {
    render(<LandingPage />);
    // The brand name appears in header and footer
    const brandElements = screen.getAllByText("Mu'aththir");
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the footer with navigation links', () => {
    render(<LandingPage />);
    const footerNav = screen.getByRole('navigation', { name: 'Footer navigation' });
    expect(footerNav).toBeInTheDocument();
  });
});

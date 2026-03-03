/**
 * Tests for the Home page
 * @task FRONTEND-01
 */
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

// Mock next/link since we're in a test environment
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('Home Page', () => {
  test('[FRONTEND-01][AC-1] home page renders without errors', () => {
    render(<HomePage />);
    // The page should render — if it throws, this test will fail
    expect(document.body).toBeTruthy();
  });

  test('[FRONTEND-01][AC-2] home page has a call-to-action button', () => {
    render(<HomePage />);
    // There should be at least one CTA link pointing to register
    const ctaLinks = screen.getAllByRole('link', {
      name: /start free assessment/i,
    });
    expect(ctaLinks.length).toBeGreaterThan(0);
  });

  test('[FRONTEND-01][AC-3] home page is accessible — has main heading', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('AI Fluency');
  });

  test('[FRONTEND-01][AC-3b] home page has labeled sections', () => {
    render(<HomePage />);
    // Should have labeled sections for accessibility
    const sections = document.querySelectorAll('section[aria-labelledby]');
    expect(sections.length).toBeGreaterThan(0);
  });
});

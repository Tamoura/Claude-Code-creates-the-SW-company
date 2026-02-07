import { render, screen } from '@testing-library/react';
import ReposPage from '../src/app/dashboard/repos/page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('Repos Page', () => {
  it('renders the page heading', () => {
    render(<ReposPage />);
    expect(screen.getByText('Repositories')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<ReposPage />);
    expect(
      screen.getByText(/connected github repositories/i)
    ).toBeInTheDocument();
  });

  it('renders the Connect Repository button', () => {
    render(<ReposPage />);
    expect(
      screen.getByRole('button', { name: /connect repository/i })
    ).toBeInTheDocument();
  });

  it('renders repository cards with names', () => {
    render(<ReposPage />);
    expect(screen.getByText('backend-api')).toBeInTheDocument();
    expect(screen.getByText('frontend-app')).toBeInTheDocument();
    expect(screen.getByText('shared-utils')).toBeInTheDocument();
  });

  it('renders repository cards with languages', () => {
    render(<ReposPage />);
    // All repos are TypeScript, so multiple matches expected
    const langLabels = screen.getAllByText('TypeScript');
    expect(langLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders repository metric values', () => {
    render(<ReposPage />);
    // Check for metric labels in repo cards
    const coverageLabels = screen.getAllByText('Coverage');
    expect(coverageLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders repository status badges', () => {
    render(<ReposPage />);
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders links to individual repo detail pages', () => {
    render(<ReposPage />);
    const repoLinks = screen.getAllByRole('link');
    const detailLinks = repoLinks.filter((link) =>
      link.getAttribute('href')?.startsWith('/dashboard/repos/')
    );
    expect(detailLinks.length).toBeGreaterThanOrEqual(1);
  });
});

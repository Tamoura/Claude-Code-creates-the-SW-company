import { render, screen } from '@testing-library/react';
import Sidebar from '../src/components/layout/Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('Dashboard Layout (Sidebar)', () => {
  it('renders the sidebar with Pulse branding', () => {
    render(<Sidebar />);
    expect(screen.getByText('Pulse')).toBeInTheDocument();
  });

  it('renders main navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Sprint Risk')).toBeInTheDocument();
  });

  it('renders monitoring navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders settings navigation', () => {
    render(<Sidebar />);
    // "Settings" appears as both section label and nav link
    const settingsElements = screen.getAllByText('Settings');
    expect(settingsElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the logout button', () => {
    render(<Sidebar />);
    expect(screen.getByText('Log Out')).toBeInTheDocument();
  });

  it('has the correct navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Activity').closest('a')).toHaveAttribute('href', '/dashboard/activity');
    expect(screen.getByText('Velocity').closest('a')).toHaveAttribute('href', '/dashboard/velocity');
  });
});

import { render, screen } from '@testing-library/react';
import Sidebar from '../src/components/layout/Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/velocity',
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('Sidebar', () => {
  it('renders the sidebar element', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders section labels', () => {
    render(<Sidebar />);
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    // "Settings" appears both as a section label and a nav link
    const settingsElements = screen.getAllByText('Settings');
    expect(settingsElements.length).toBe(2);
  });

  it('renders all expected nav links', () => {
    render(<Sidebar />);
    const expectedLinks = [
      '/dashboard',
      '/dashboard/activity',
      '/dashboard/velocity',
      '/dashboard/quality',
      '/dashboard/risk',
      '/dashboard/repos',
      '/dashboard/team',
      '/dashboard/overview',
      '/dashboard/settings',
    ];
    expectedLinks.forEach((href) => {
      const link = screen.getAllByRole('link').find((el) => el.getAttribute('href') === href);
      expect(link).toBeTruthy();
    });
  });

  it('hides on mobile when isOpen is false', () => {
    render(<Sidebar isOpen={false} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toContain('-translate-x-full');
  });

  it('shows on mobile when isOpen is true', () => {
    render(<Sidebar isOpen={true} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toContain('translate-x-0');
  });
});

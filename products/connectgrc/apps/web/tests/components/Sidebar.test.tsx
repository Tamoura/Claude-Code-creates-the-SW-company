import React from 'react';
import { render, screen } from '@testing-library/react';
import Sidebar from '../../src/components/layout/Sidebar';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Sidebar', () => {
  it('renders the ConnectGRC brand', () => {
    render(<Sidebar />);
    expect(screen.getByText('ConnectGRC')).toBeInTheDocument();
  });

  it('renders talent navigation links by default', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.getByText('Career')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('renders admin navigation links when variant is admin', () => {
    render(<Sidebar variant="admin" />);
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Frameworks')).toBeInTheDocument();
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('does not render admin links when variant is talent', () => {
    render(<Sidebar variant="talent" />);
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('renders links with correct hrefs', () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    const profileLink = screen.getByText('Profile').closest('a');
    expect(profileLink).toHaveAttribute('href', '/profile');
  });

  it('renders admin links with correct hrefs', () => {
    render(<Sidebar variant="admin" />);
    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    const frameworksLink = screen.getByText('Frameworks').closest('a');
    expect(frameworksLink).toHaveAttribute('href', '/admin/frameworks');
  });

  it('renders a link back to the home page', () => {
    render(<Sidebar />);
    const brandLink = screen.getByText('ConnectGRC').closest('a');
    expect(brandLink).toHaveAttribute('href', '/');
  });
});

import { render, screen } from '@testing-library/react';
import SettingsPage from '../src/app/dashboard/settings/page';

describe('Settings Page', () => {
  it('renders the page heading', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<SettingsPage />);
    expect(
      screen.getByText(/account settings and github connection/i)
    ).toBeInTheDocument();
  });

  it('renders the profile section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders display name field', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Display Name')).toBeInTheDocument();
  });

  it('renders email field', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders the GitHub connection section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('GitHub Connection')).toBeInTheDocument();
  });

  it('renders connected status', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders the GitHub username', () => {
    render(<SettingsPage />);
    expect(screen.getByText('@alex-eng')).toBeInTheDocument();
  });

  it('renders navigation links to sub-settings', () => {
    render(<SettingsPage />);
    const notifLink = screen.getByRole('link', { name: /notification/i });
    expect(notifLink).toHaveAttribute('href', '/dashboard/settings/notifications');
  });

  it('renders link to team management', () => {
    render(<SettingsPage />);
    const teamLink = screen.getByRole('link', { name: /team management/i });
    expect(teamLink).toHaveAttribute('href', '/dashboard/settings/team');
  });

  it('renders connected repos count', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/3 repositories connected/i)).toBeInTheDocument();
  });
});

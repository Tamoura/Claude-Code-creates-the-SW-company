import { render, screen, fireEvent } from '@testing-library/react';
import TeamSettingsPage from '../src/app/dashboard/settings/team/page';

describe('Team Settings Page', () => {
  it('renders the page heading', () => {
    render(<TeamSettingsPage />);
    expect(screen.getByText('Team Management')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<TeamSettingsPage />);
    expect(
      screen.getByText(/invite members, manage roles, and configure team settings/i)
    ).toBeInTheDocument();
  });

  it('renders member list section', () => {
    render(<TeamSettingsPage />);
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('renders existing team members', () => {
    render(<TeamSettingsPage />);
    expect(screen.getByText('Alex Engineer')).toBeInTheDocument();
    expect(screen.getByText('Priya Dev')).toBeInTheDocument();
    expect(screen.getByText('Sam QA')).toBeInTheDocument();
  });

  it('renders member roles', () => {
    render(<TeamSettingsPage />);
    // Admin appears in both the role badge and the invite dropdown
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    // Member appears in both badge(s) and invite dropdown
    expect(screen.getAllByText('Member').length).toBeGreaterThanOrEqual(2);
  });

  it('renders invite member section', () => {
    render(<TeamSettingsPage />);
    expect(screen.getByText('Invite Member')).toBeInTheDocument();
  });

  it('renders email input for invite', () => {
    render(<TeamSettingsPage />);
    expect(
      screen.getByPlaceholderText('Email address')
    ).toBeInTheDocument();
  });

  it('renders role selector for invite', () => {
    render(<TeamSettingsPage />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders invite button', () => {
    render(<TeamSettingsPage />);
    expect(
      screen.getByRole('button', { name: /send invite/i })
    ).toBeInTheDocument();
  });

  it('renders remove buttons for non-admin members', () => {
    render(<TeamSettingsPage />);
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    // Should have remove buttons for non-admin members
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a back link to settings', () => {
    render(<TeamSettingsPage />);
    const link = screen.getByRole('link', { name: /back to settings/i });
    expect(link).toHaveAttribute('href', '/dashboard/settings');
  });

  it('shows confirmation when remove is clicked', () => {
    render(<TeamSettingsPage />);
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });
});

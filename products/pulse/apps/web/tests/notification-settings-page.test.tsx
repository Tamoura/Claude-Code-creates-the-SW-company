import { render, screen, fireEvent } from '@testing-library/react';
import NotificationSettingsPage from '../src/app/dashboard/settings/notifications/page';

describe('Notification Settings Page', () => {
  it('renders the page heading', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<NotificationSettingsPage />);
    expect(
      screen.getByText(/configure notification categories and quiet hours/i)
    ).toBeInTheDocument();
  });

  it('renders push notification toggles', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
  });

  it('renders PR merged notification toggle', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('PR Merged')).toBeInTheDocument();
  });

  it('renders PR review requested toggle', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Review Requested')).toBeInTheDocument();
  });

  it('renders deployment notification toggle', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Deployments')).toBeInTheDocument();
  });

  it('renders risk alert notification toggle', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Risk Alerts')).toBeInTheDocument();
  });

  it('renders email digest section', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Email Digest')).toBeInTheDocument();
  });

  it('renders frequency selector options', () => {
    render(<NotificationSettingsPage />);
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('renders toggle switches for each notification type', () => {
    render(<NotificationSettingsPage />);
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBeGreaterThanOrEqual(4);
  });

  it('toggles a notification switch when clicked', () => {
    render(<NotificationSettingsPage />);
    const toggles = screen.getAllByRole('switch');
    const firstToggle = toggles[0];
    const initialState = firstToggle.getAttribute('aria-checked');
    fireEvent.click(firstToggle);
    expect(firstToggle.getAttribute('aria-checked')).not.toBe(initialState);
  });

  it('renders a back link to settings', () => {
    render(<NotificationSettingsPage />);
    const link = screen.getByRole('link', { name: /back to settings/i });
    expect(link).toHaveAttribute('href', '/dashboard/settings');
  });
});

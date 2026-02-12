import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsSettingsPage from '../../src/app/dashboard/settings/notifications/page';

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

const STORAGE_KEY = 'muaththir-notification-prefs';

describe('NotificationsSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders page header with title and subtitle', () => {
    render(<NotificationsSettingsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Notification Preferences' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Configure how and when you receive reminders.')
    ).toBeInTheDocument();
  });

  it('renders a back link to settings', () => {
    render(<NotificationsSettingsPage />);

    const backLink = screen.getByRole('link', { name: /Back/i });
    expect(backLink).toHaveAttribute('href', '/dashboard/settings');
  });

  it('renders three toggle switches', () => {
    render(<NotificationsSettingsPage />);

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);
  });

  it('renders toggle labels with descriptions', () => {
    render(<NotificationsSettingsPage />);

    expect(screen.getByText('Daily Observation Reminder')).toBeInTheDocument();
    expect(
      screen.getByText('Get a gentle reminder to log an observation each evening.')
    ).toBeInTheDocument();

    expect(screen.getByText('Weekly Digest Email')).toBeInTheDocument();
    expect(
      screen.getByText('Receive a weekly summary of your child\'s progress.')
    ).toBeInTheDocument();

    expect(screen.getByText('Milestone Alerts')).toBeInTheDocument();
    expect(
      screen.getByText('Get notified when new milestones become relevant for your child\'s age.')
    ).toBeInTheDocument();
  });

  it('all toggles default to off when no localStorage data', () => {
    render(<NotificationsSettingsPage />);

    const switches = screen.getAllByRole('switch');
    switches.forEach((toggle) => {
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('loads preferences from localStorage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dailyReminder: true,
        weeklyDigest: false,
        milestoneAlerts: true,
      })
    );

    render(<NotificationsSettingsPage />);

    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');  // daily
    expect(switches[1]).toHaveAttribute('aria-checked', 'false'); // weekly
    expect(switches[2]).toHaveAttribute('aria-checked', 'true');  // milestones
  });

  it('saves to localStorage when a toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationsSettingsPage />);

    const dailyToggle = screen.getByLabelText('Toggle daily reminder');
    await user.click(dailyToggle);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.dailyReminder).toBe(true);
  });

  it('shows saved confirmation message after toggling', async () => {
    const user = userEvent.setup();
    render(<NotificationsSettingsPage />);

    const dailyToggle = screen.getByLabelText('Toggle daily reminder');
    await user.click(dailyToggle);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Preferences saved')).toBeInTheDocument();
    });
  });

  it('updates toggle visual state after clicking', async () => {
    const user = userEvent.setup();
    render(<NotificationsSettingsPage />);

    const weeklyToggle = screen.getByLabelText('Toggle weekly digest');
    expect(weeklyToggle).toHaveAttribute('aria-checked', 'false');

    await user.click(weeklyToggle);

    expect(weeklyToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('can toggle off a previously on preference', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dailyReminder: true,
        weeklyDigest: false,
        milestoneAlerts: false,
      })
    );

    const user = userEvent.setup();
    render(<NotificationsSettingsPage />);

    const dailyToggle = screen.getByLabelText('Toggle daily reminder');
    expect(dailyToggle).toHaveAttribute('aria-checked', 'true');

    await user.click(dailyToggle);

    expect(dailyToggle).toHaveAttribute('aria-checked', 'false');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.dailyReminder).toBe(false);
  });

  it('persists all preferences across multiple toggles', async () => {
    const user = userEvent.setup();
    render(<NotificationsSettingsPage />);

    const dailyToggle = screen.getByLabelText('Toggle daily reminder');
    const milestoneToggle = screen.getByLabelText('Toggle milestone alerts');

    await user.click(dailyToggle);
    await user.click(milestoneToggle);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.dailyReminder).toBe(true);
    expect(stored.weeklyDigest).toBe(false);
    expect(stored.milestoneAlerts).toBe(true);
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json');
    render(<NotificationsSettingsPage />);

    // Should render with defaults (all off)
    const switches = screen.getAllByRole('switch');
    switches.forEach((toggle) => {
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });
});

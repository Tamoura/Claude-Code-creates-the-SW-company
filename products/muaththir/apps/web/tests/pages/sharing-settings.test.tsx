import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SharingSettingsPage from '../../src/app/dashboard/settings/sharing/page';

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

// Use fake timers to control setTimeout in the component
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('SharingSettingsPage', () => {
  it('renders the page header with title and description', () => {
    render(<SharingSettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Family Sharing' })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Invite family members to view or contribute to your children's development tracking."
      )
    ).toBeInTheDocument();
  });

  it('renders the invite form with email input and role selector', () => {
    render(<SharingSettingsPage />);

    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter family member's email/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Send Invite/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders the role selector with Viewer and Contributor options', () => {
    render(<SharingSettingsPage />);

    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Viewer');
    expect(options[1]).toHaveTextContent('Contributor');
  });

  it('shows empty state when no shares exist', () => {
    render(<SharingSettingsPage />);

    expect(
      screen.getByText('No family members invited yet')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Invite a spouse, grandparent, or caregiver to participate.'
      )
    ).toBeInTheDocument();
  });

  it('adds a new share when invite form is submitted with valid email', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });

    await user.type(emailInput, 'grandma@example.com');
    await user.click(inviteButton);

    expect(screen.getByText('grandma@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    // Empty state should be gone
    expect(
      screen.queryByText('No family members invited yet')
    ).not.toBeInTheDocument();
  });

  it('shows success message after sending invite', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });

    await user.type(emailInput, 'uncle@example.com');
    await user.click(inviteButton);

    expect(screen.getByText('Invitation sent!')).toBeInTheDocument();
  });

  it('clears the email input after successful invite', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const emailInput = screen.getByLabelText(
      /Email address/i
    ) as HTMLInputElement;

    await user.type(emailInput, 'uncle@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    expect(emailInput.value).toBe('');
  });

  it('assigns the selected role to the invited member', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const roleSelect = screen.getByRole('combobox');

    // Select Contributor role
    await user.selectOptions(roleSelect, 'contributor');
    await user.type(emailInput, 'tutor@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    expect(screen.getByText('tutor@example.com')).toBeInTheDocument();
    // Find the Contributor badge in the shares list (not the select option)
    const shareRow = screen.getByText('tutor@example.com').closest('div')!;
    expect(
      within(shareRow.parentElement!).getByText('Contributor')
    ).toBeInTheDocument();
  });

  it('removes a share when the remove button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    // First add a share
    const emailInput = screen.getByLabelText(/Email address/i);
    await user.type(emailInput, 'grandpa@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    expect(screen.getByText('grandpa@example.com')).toBeInTheDocument();

    // Now remove it
    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    expect(
      screen.queryByText('grandpa@example.com')
    ).not.toBeInTheDocument();
    // Empty state should return
    expect(
      screen.getByText('No family members invited yet')
    ).toBeInTheDocument();
  });

  it('can add multiple shares', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const emailInput = screen.getByLabelText(/Email address/i);
    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });

    // Add first
    await user.type(emailInput, 'mom@example.com');
    await user.click(inviteButton);
    expect(screen.getByText('mom@example.com')).toBeInTheDocument();

    // Add second
    await user.type(emailInput, 'dad@example.com');
    await user.click(inviteButton);
    expect(screen.getByText('mom@example.com')).toBeInTheDocument();
    expect(screen.getByText('dad@example.com')).toBeInTheDocument();
  });

  it('shows Viewer role badge by default for invited members', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const emailInput = screen.getByLabelText(/Email address/i);
    await user.type(emailInput, 'viewer@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    expect(screen.getByText('viewer@example.com')).toBeInTheDocument();
    // The Viewer badge should appear in the shares list
    const shareRow = screen.getByText('viewer@example.com').closest('div')!;
    expect(
      within(shareRow.parentElement!).getByText('Viewer')
    ).toBeInTheDocument();
  });

  it('does not submit if email input is empty', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SharingSettingsPage />);

    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });
    await user.click(inviteButton);

    // Should still show empty state (no share added)
    expect(
      screen.getByText('No family members invited yet')
    ).toBeInTheDocument();
  });

  it('has a back link to settings', () => {
    render(<SharingSettingsPage />);

    const backLink = screen.getByRole('link', { name: /Back/i });
    expect(backLink).toHaveAttribute('href', '/dashboard/settings');
  });
});

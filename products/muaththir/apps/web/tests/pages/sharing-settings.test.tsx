import { render, screen, waitFor, within } from '@testing-library/react';
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

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    getShares: jest.fn(),
    inviteShare: jest.fn(),
    revokeShare: jest.fn(),
  },
}));

import { apiClient } from '../../src/lib/api-client';
const mockGetShares = apiClient.getShares as jest.Mock;
const mockInviteShare = apiClient.inviteShare as jest.Mock;
const mockRevokeShare = apiClient.revokeShare as jest.Mock;

describe('SharingSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetShares.mockResolvedValue([]);
  });

  it('renders the page header with title and description', async () => {
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Family Sharing' })).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Invite family members to view or contribute to your children's development tracking."
      )
    ).toBeInTheDocument();
  });

  it('renders the invite form with email input and role selector', async () => {
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText(/Enter family member's email/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Send Invite/i })
    ).toBeInTheDocument();
  });

  it('renders the role selector with Viewer and Contributor options', async () => {
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });

    // The role selector label is "Viewer / Contributor"
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects.find((s) => {
      const options = within(s).queryAllByRole('option');
      return options.some((o) => o.textContent === 'Viewer');
    })!;
    const options = within(roleSelect).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Viewer');
    expect(options[1]).toHaveTextContent('Contributor');
  });

  it('shows empty state when no shares exist', async () => {
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No family members invited yet')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        'Invite a spouse, grandparent, or caregiver to participate.'
      )
    ).toBeInTheDocument();
  });

  it('adds a new share when invite form is submitted with valid email', async () => {
    mockInviteShare.mockResolvedValue({
      id: 'share-1',
      inviteeEmail: 'grandma@example.com',
      role: 'viewer',
      status: 'pending',
    });

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('No family members invited yet')).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email address/i);
    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });

    await user.type(emailInput, 'grandma@example.com');
    await user.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('grandma@example.com')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(
      screen.queryByText('No family members invited yet')
    ).not.toBeInTheDocument();
  });

  it('shows success message after sending invite', async () => {
    mockInviteShare.mockResolvedValue({
      id: 'share-1',
      inviteeEmail: 'uncle@example.com',
      role: 'viewer',
      status: 'pending',
    });

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email address/i);
    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });

    await user.type(emailInput, 'uncle@example.com');
    await user.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invitation sent!')).toBeInTheDocument();
    });
  });

  it('clears the email input after successful invite', async () => {
    mockInviteShare.mockResolvedValue({
      id: 'share-1',
      inviteeEmail: 'uncle@example.com',
      role: 'viewer',
      status: 'pending',
    });

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(
      /Email address/i
    ) as HTMLInputElement;

    await user.type(emailInput, 'uncle@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    await waitFor(() => {
      expect(emailInput.value).toBe('');
    });
  });

  it('assigns the selected role to the invited member', async () => {
    mockInviteShare.mockResolvedValue({
      id: 'share-1',
      inviteeEmail: 'tutor@example.com',
      role: 'contributor',
      status: 'pending',
    });

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email address/i);
    // Find the role selector (the select that has Viewer/Contributor options)
    const selects = screen.getAllByRole('combobox');
    const roleSelect = selects.find((s) => {
      const options = within(s).queryAllByRole('option');
      return options.some((o) => o.textContent === 'Viewer');
    })!;

    await user.selectOptions(roleSelect, 'contributor');
    await user.type(emailInput, 'tutor@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    await waitFor(() => {
      expect(screen.getByText('tutor@example.com')).toBeInTheDocument();
    });
    // Find the Contributor badge in the shares list
    const shareRow = screen.getByText('tutor@example.com').closest('div')!;
    expect(
      within(shareRow.parentElement!).getByText('Contributor')
    ).toBeInTheDocument();
  });

  it('removes a share when the remove button is clicked', async () => {
    mockInviteShare.mockResolvedValue({
      id: 'share-1',
      inviteeEmail: 'grandpa@example.com',
      role: 'viewer',
      status: 'pending',
    });
    mockRevokeShare.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('No family members invited yet')).toBeInTheDocument();
    });

    // First add a share
    const emailInput = screen.getByLabelText(/Email address/i);
    await user.type(emailInput, 'grandpa@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    await waitFor(() => {
      expect(screen.getByText('grandpa@example.com')).toBeInTheDocument();
    });

    // Now remove it
    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(
        screen.queryByText('grandpa@example.com')
      ).not.toBeInTheDocument();
    });
    // Empty state should return
    expect(
      screen.getByText('No family members invited yet')
    ).toBeInTheDocument();
  });

  it('can add multiple shares', async () => {
    let shareId = 0;
    mockInviteShare.mockImplementation(async ({ email, role }: { email: string; role: string }) => ({
      id: `share-${++shareId}`,
      inviteeEmail: email,
      role,
      status: 'pending',
    }));

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email address/i);
    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });

    // Add first
    await user.type(emailInput, 'mom@example.com');
    await user.click(inviteButton);
    await waitFor(() => {
      expect(screen.getByText('mom@example.com')).toBeInTheDocument();
    });

    // Add second
    await user.type(emailInput, 'dad@example.com');
    await user.click(inviteButton);
    await waitFor(() => {
      expect(screen.getByText('mom@example.com')).toBeInTheDocument();
      expect(screen.getByText('dad@example.com')).toBeInTheDocument();
    });
  });

  it('shows Viewer role badge by default for invited members', async () => {
    mockInviteShare.mockResolvedValue({
      id: 'share-1',
      inviteeEmail: 'viewer@example.com',
      role: 'viewer',
      status: 'pending',
    });

    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email address/i);
    await user.type(emailInput, 'viewer@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/i }));

    await waitFor(() => {
      expect(screen.getByText('viewer@example.com')).toBeInTheDocument();
    });
    // The Viewer badge should appear in the shares list
    const shareRow = screen.getByText('viewer@example.com').closest('div')!;
    expect(
      within(shareRow.parentElement!).getByText('Viewer')
    ).toBeInTheDocument();
  });

  it('does not submit if email input is empty', async () => {
    const user = userEvent.setup();
    render(<SharingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('No family members invited yet')).toBeInTheDocument();
    });

    const inviteButton = screen.getByRole('button', { name: /Send Invite/i });
    await user.click(inviteButton);

    // Should still show empty state (no share added)
    expect(
      screen.getByText('No family members invited yet')
    ).toBeInTheDocument();
    expect(mockInviteShare).not.toHaveBeenCalled();
  });

  it('has a back link to settings', async () => {
    render(<SharingSettingsPage />);

    const backLink = screen.getByRole('link', { name: /Back/i });
    expect(backLink).toHaveAttribute('href', '/dashboard/settings');
  });
});

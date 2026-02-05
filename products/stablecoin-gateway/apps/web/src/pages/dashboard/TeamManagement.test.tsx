import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamManagement from './TeamManagement';
import * as useTeamModule from '../../hooks/useTeam';
import * as useAuthModule from '../../hooks/useAuth';

vi.mock('../../hooks/useTeam');
vi.mock('../../hooks/useAuth');

describe('TeamManagement', () => {
  const mockCreateOrganization = vi.fn();
  const mockSelectOrganization = vi.fn();
  const mockClearCurrentOrg = vi.fn();
  const mockAddMember = vi.fn();
  const mockUpdateMemberRole = vi.fn();
  const mockRemoveMember = vi.fn();
  const mockLeaveOrganization = vi.fn();

  const defaultOrgList = [
    {
      id: 'org-1',
      name: 'Acme Corp',
      role: 'OWNER' as const,
      joined_at: '2026-01-15T00:00:00Z',
      created_at: '2026-01-15T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
    },
    {
      id: 'org-2',
      name: 'Beta Inc',
      role: 'MEMBER' as const,
      joined_at: '2026-02-01T00:00:00Z',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    },
  ];

  const defaultOrgDetail = {
    id: 'org-1',
    name: 'Acme Corp',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    members: [
      {
        id: 'mem-1',
        user_id: 'user-1',
        email: 'owner@acme.com',
        role: 'OWNER' as const,
        invited_by: null,
        joined_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
      {
        id: 'mem-2',
        user_id: 'user-2',
        email: 'member@acme.com',
        role: 'MEMBER' as const,
        invited_by: 'user-1',
        joined_at: '2026-01-20T00:00:00Z',
        updated_at: '2026-01-20T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'user-1', email: 'owner@acme.com' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
      organizations: defaultOrgList,
      currentOrg: null,
      isLoading: false,
      error: null,
      createOrganization: mockCreateOrganization,
      selectOrganization: mockSelectOrganization,
      clearCurrentOrg: mockClearCurrentOrg,
      addMember: mockAddMember,
      updateMemberRole: mockUpdateMemberRole,
      removeMember: mockRemoveMember,
      leaveOrganization: mockLeaveOrganization,
    });
  });

  describe('Rendering', () => {
    it('renders page title and description', () => {
      render(<TeamManagement />);
      expect(screen.getByText('Team Management')).toBeInTheDocument();
      expect(screen.getByText('Manage your organizations and team members')).toBeInTheDocument();
    });

    it('renders organization list', () => {
      render(<TeamManagement />);
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    });

    it('shows role badges in org list', () => {
      render(<TeamManagement />);
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: [],
        currentOrg: null,
        isLoading: true,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      const { container } = render(<TeamManagement />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error state', () => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: [],
        currentOrg: null,
        isLoading: false,
        error: 'Failed to load organizations',
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      expect(screen.getByText('Failed to load organizations')).toBeInTheDocument();
    });

    it('shows empty state when no organizations', () => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: [],
        currentOrg: null,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      expect(screen.getByText('No organizations yet. Create one to get started.')).toBeInTheDocument();
    });
  });

  describe('Create Organization', () => {
    it('shows create form when button clicked', () => {
      render(<TeamManagement />);
      fireEvent.click(screen.getByText('Create Organization'));
      expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
    });

    it('calls createOrganization on submit', async () => {
      mockCreateOrganization.mockResolvedValueOnce(undefined);
      render(<TeamManagement />);

      fireEvent.click(screen.getByText('Create Organization'));
      const input = screen.getByLabelText('Organization name');
      fireEvent.change(input, { target: { value: 'New Org' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith('New Org');
      });
    });

    it('hides form on cancel', () => {
      render(<TeamManagement />);
      fireEvent.click(screen.getByText('Create Organization'));
      expect(screen.getByLabelText('Organization name')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByLabelText('Organization name')).not.toBeInTheDocument();
    });
  });

  describe('Organization Detail', () => {
    it('selects organization on click', () => {
      render(<TeamManagement />);
      fireEvent.click(screen.getByText('Acme Corp'));
      expect(mockSelectOrganization).toHaveBeenCalledWith('org-1');
    });

    it('shows members table when org is selected', () => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      expect(screen.getByText('owner@acme.com')).toBeInTheDocument();
      expect(screen.getByText('member@acme.com')).toBeInTheDocument();
      expect(screen.getByText('2 members')).toBeInTheDocument();
    });

    it('shows (you) marker for current user', () => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      expect(screen.getByText('(you)')).toBeInTheDocument();
    });

    it('goes back to list when back button clicked', () => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      fireEvent.click(screen.getByLabelText('Back to organizations'));
      expect(mockClearCurrentOrg).toHaveBeenCalled();
    });
  });

  describe('Member Management (OWNER view)', () => {
    beforeEach(() => {
      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });
    });

    it('shows Add Member button for OWNER', () => {
      render(<TeamManagement />);
      expect(screen.getByText('Add Member')).toBeInTheDocument();
    });

    it('shows add member form when clicked', () => {
      render(<TeamManagement />);
      fireEvent.click(screen.getByText('Add Member'));
      expect(screen.getByLabelText('Member email')).toBeInTheDocument();
      expect(screen.getByLabelText('Member role')).toBeInTheDocument();
    });

    it('calls addMember on form submit', async () => {
      mockAddMember.mockResolvedValueOnce(undefined);
      render(<TeamManagement />);

      fireEvent.click(screen.getByText('Add Member'));
      const emailInput = screen.getByLabelText('Member email');
      fireEvent.change(emailInput, { target: { value: 'new@acme.com' } });
      fireEvent.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(mockAddMember).toHaveBeenCalledWith('org-1', 'new@acme.com', 'MEMBER');
      });
    });

    it('shows remove confirmation and calls removeMember', async () => {
      mockRemoveMember.mockResolvedValueOnce(undefined);
      render(<TeamManagement />);

      // Click Remove on the non-self member
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);

      // Confirmation should appear
      expect(screen.getByText('Confirm')).toBeInTheDocument();

      // Click Confirm
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockRemoveMember).toHaveBeenCalledWith('org-1', 'mem-2');
      });
    });

    it('shows role dropdown for non-self members', () => {
      render(<TeamManagement />);
      // member@acme.com should have a role dropdown
      expect(screen.getByLabelText('Role for member@acme.com')).toBeInTheDocument();
    });

    it('calls updateMemberRole when role changed', async () => {
      mockUpdateMemberRole.mockResolvedValueOnce(undefined);
      render(<TeamManagement />);

      const roleSelect = screen.getByLabelText('Role for member@acme.com');
      fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

      await waitFor(() => {
        expect(mockUpdateMemberRole).toHaveBeenCalledWith('org-1', 'mem-2', 'ADMIN');
      });
    });
  });

  describe('Member view (non-OWNER)', () => {
    it('does not show Add Member or Remove for MEMBER role', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: 'user-2', email: 'member@acme.com' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
      });

      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      expect(screen.queryByText('Add Member')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });

    it('shows Leave button for non-OWNER', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: 'user-2', email: 'member@acme.com' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
      });

      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      expect(screen.getByText('Leave')).toBeInTheDocument();
    });

    it('calls leaveOrganization after confirmation', async () => {
      mockLeaveOrganization.mockResolvedValueOnce(undefined);

      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: 'user-2', email: 'member@acme.com' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
      });

      vi.spyOn(useTeamModule, 'useTeam').mockReturnValue({
        organizations: defaultOrgList,
        currentOrg: defaultOrgDetail,
        isLoading: false,
        error: null,
        createOrganization: mockCreateOrganization,
        selectOrganization: mockSelectOrganization,
        clearCurrentOrg: mockClearCurrentOrg,
        addMember: mockAddMember,
        updateMemberRole: mockUpdateMemberRole,
        removeMember: mockRemoveMember,
        leaveOrganization: mockLeaveOrganization,
      });

      render(<TeamManagement />);
      fireEvent.click(screen.getByText('Leave'));
      fireEvent.click(screen.getByText('Confirm Leave'));

      await waitFor(() => {
        expect(mockLeaveOrganization).toHaveBeenCalledWith('org-1');
      });
    });
  });
});

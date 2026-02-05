import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTeam, type TeamRole, type TeamMember } from '../../hooks/useTeam';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  OWNER: 'bg-accent-pink/20 text-accent-pink',
  ADMIN: 'bg-accent-blue/20 text-accent-blue',
  MEMBER: 'bg-accent-green/20 text-accent-green',
  VIEWER: 'bg-gray-500/20 text-gray-400',
};

export default function TeamManagement() {
  const { user } = useAuth();
  const {
    organizations,
    currentOrg,
    isLoading,
    error,
    createOrganization,
    selectOrganization,
    clearCurrentOrg,
    addMember,
    updateMemberRole,
    removeMember,
    leaveOrganization,
  } = useTeam();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<TeamRole>('MEMBER');
  const [adding, setAdding] = useState(false);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const currentUserRole = currentOrg?.members.find(m => m.user_id === user?.id)?.role;
  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      await createOrganization(orgName.trim());
      setOrgName('');
      setShowCreateForm(false);
    } catch {
      // error is set by hook
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !memberEmail.trim()) return;
    setAdding(true);
    try {
      await addMember(currentOrg.id, memberEmail.trim(), memberRole);
      setMemberEmail('');
      setMemberRole('MEMBER');
      setShowAddMember(false);
    } catch {
      // error is set by hook
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: TeamRole) => {
    if (!currentOrg) return;
    await updateMemberRole(currentOrg.id, memberId, role);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentOrg) return;
    await removeMember(currentOrg.id, memberId);
    setConfirmRemove(null);
  };

  const handleLeave = async () => {
    if (!currentOrg) return;
    await leaveOrganization(currentOrg.id);
    setConfirmLeave(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Team Management</h2>
          <p className="text-text-secondary">Manage your organizations and team members</p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
          >
            Create Organization
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Organization Form */}
      {showCreateForm && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Create Organization</h3>
          <form onSubmit={handleCreateOrg} className="flex gap-3">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization name"
              className="flex-1 bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
              aria-label="Organization name"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !orgName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setOrgName(''); }}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Organizations List */}
      {!currentOrg && (
        <div className="bg-card-bg border border-card-border rounded-xl">
          {organizations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-muted">No organizations yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-card-border">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => selectOrganization(org.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-sidebar-hover transition-colors text-left"
                >
                  <div>
                    <p className="text-text-primary font-medium">{org.name}</p>
                    <p className="text-text-muted text-sm">
                      Joined {new Date(org.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[org.role]}`}>
                    {ROLE_LABELS[org.role]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Organization Detail View */}
      {currentOrg && (
        <>
          {/* Org Header */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setConfirmLeave(false);
                    setConfirmRemove(null);
                    clearCurrentOrg();
                  }}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Back to organizations"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{currentOrg.name}</h3>
                  <p className="text-text-muted text-sm">
                    {currentOrg.members.length} member{currentOrg.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManageMembers && !showAddMember && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    Add Member
                  </button>
                )}
                {currentUserRole !== 'OWNER' && (
                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors"
                  >
                    Leave
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Add Member Form */}
          {showAddMember && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Add Team Member</h4>
              <form onSubmit={handleAddMember} className="flex gap-3">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
                  aria-label="Member email"
                  autoFocus
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as TeamRole)}
                  className="bg-card-bg border border-card-border rounded-lg px-3 py-2.5 text-text-primary focus:border-accent-blue focus:outline-none"
                  aria-label="Member role"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  {currentUserRole === 'OWNER' && <option value="OWNER">Owner</option>}
                </select>
                <button
                  type="submit"
                  disabled={adding || !memberEmail.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddMember(false); setMemberEmail(''); }}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Leave Confirmation */}
          {confirmLeave && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <p className="text-red-400 mb-3">Are you sure you want to leave <strong>{currentOrg.name}</strong>?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleLeave}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Confirm Leave
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-6 py-3.5 text-text-muted font-medium">Email</th>
                  <th className="text-left px-6 py-3.5 text-text-muted font-medium">Role</th>
                  <th className="text-left px-6 py-3.5 text-text-muted font-medium">Joined</th>
                  {canManageMembers && (
                    <th className="text-right px-6 py-3.5 text-text-muted font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentOrg.members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    currentUserId={user?.id ?? ''}
                    currentUserRole={currentUserRole}
                    canManageMembers={canManageMembers}
                    confirmRemove={confirmRemove}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                    onConfirmRemove={setConfirmRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  canManageMembers,
  confirmRemove,
  onRoleChange,
  onRemove,
  onConfirmRemove,
}: {
  member: TeamMember;
  currentUserId: string;
  currentUserRole?: TeamRole;
  canManageMembers: boolean;
  confirmRemove: string | null;
  onRoleChange: (memberId: string, role: TeamRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onConfirmRemove: (memberId: string | null) => void;
}) {
  const isSelf = member.user_id === currentUserId;
  const isOwner = member.role === 'OWNER';
  // ADMINs cannot change OWNER roles
  const canEditRole = canManageMembers && !isSelf && !(currentUserRole === 'ADMIN' && isOwner);
  const canRemove = canManageMembers && !isSelf && !(currentUserRole === 'ADMIN' && isOwner);

  return (
    <tr className="border-b border-card-border last:border-b-0">
      <td className="px-6 py-4 text-text-primary">
        {member.email}
        {isSelf && <span className="ml-2 text-text-muted text-xs">(you)</span>}
      </td>
      <td className="px-6 py-4">
        {canEditRole ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value as TeamRole)}
            className="bg-transparent border border-card-border rounded px-2 py-1 text-text-primary text-xs focus:border-accent-blue focus:outline-none"
            aria-label={`Role for ${member.email}`}
          >
            {currentUserRole === 'OWNER' && <option value="OWNER">Owner</option>}
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
        ) : (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
            {ROLE_LABELS[member.role]}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-text-muted">
        {new Date(member.joined_at).toLocaleDateString()}
      </td>
      {canManageMembers && (
        <td className="px-6 py-4 text-right">
          {canRemove && confirmRemove !== member.id && (
            <button
              onClick={() => onConfirmRemove(member.id)}
              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
            >
              Remove
            </button>
          )}
          {confirmRemove === member.id && (
            <span className="flex items-center justify-end gap-2">
              <button
                onClick={() => onRemove(member.id)}
                className="text-red-400 hover:text-red-300 text-xs font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => onConfirmRemove(null)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                Cancel
              </button>
            </span>
          )}
        </td>
      )}
    </tr>
  );
}

'use client';

import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

const initialMembers: TeamMember[] = [
  { id: '1', name: 'Alex Engineer', email: 'alex@example.com', role: 'admin' },
  { id: '2', name: 'Priya Dev', email: 'priya@example.com', role: 'member' },
  { id: '3', name: 'Sam QA', email: 'sam@example.com', role: 'member' },
  { id: '4', name: 'Jordan Lead', email: 'jordan@example.com', role: 'viewer' },
];

function getRoleBadge(role: string): string {
  switch (role) {
    case 'admin':
      return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
    case 'member':
      return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    case 'viewer':
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
  }
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setConfirmRemoveId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Invite members, manage roles, and configure team settings
          </p>
        </div>
        <a
          href="/dashboard/settings"
          className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
        >
          Back to Settings
        </a>
      </div>

      {/* Invite Member */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Invite Member
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="email"
            placeholder="Email address"
            className="flex-1 bg-[var(--bg-page)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
          <select
            className="bg-[var(--bg-page)] border border-[var(--border-card)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            Send Invite
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Members
        </h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-page)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {member.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadge(member.role)}`}
                >
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
                {member.role !== 'admin' && (
                  <>
                    {confirmRemoveId === member.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)]">
                          Are you sure?
                        </span>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-500 text-xs font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(member.id)}
                        className="text-red-600 hover:text-red-500 text-xs font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

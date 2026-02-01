import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';

export default function Security() {
  const { user, logout } = useAuth();
  const [showSessions, setShowSessions] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 12) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 12 characters' });
      return;
    }
    setIsChanging(true);
    try {
      await apiClient.request('/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to change password. Check your current password.' });
    } finally {
      setIsChanging(false);
    }
  }

  const sessions = [
    { id: 'current', device: 'Current Session', ip: '127.0.0.1', lastActive: new Date().toISOString(), current: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Security</h2>
        <p className="text-text-secondary">
          Manage your security settings and access controls
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Account</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Email</p>
              <p className="text-sm text-text-secondary">{user?.email || 'Not logged in'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Password</p>
              <p className="text-sm text-text-secondary">Last changed: Unknown</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 border-t border-card-border pt-4">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-card-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
              <input
                type="password"
                placeholder="New password (min 12 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={12}
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-card-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-card-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
              <button
                type="submit"
                disabled={isChanging}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-blue rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
              >
                {isChanging ? 'Changing...' : 'Update Password'}
              </button>
            </form>
          )}
          {passwordMsg && (
            <p className={`mt-2 text-xs ${passwordMsg.type === 'success' ? 'text-accent-green' : 'text-red-400'}`}>
              {passwordMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Active Sessions</h3>
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary transition-colors"
          >
            {showSessions ? 'Hide' : 'Show'} Sessions
          </button>
        </div>

        {showSessions && (
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b border-card-border last:border-b-0">
                <div>
                  <p className="text-sm text-text-primary">
                    {session.device}
                    {session.current && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-accent-green border border-green-500/30">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted">IP: {session.ip} &middot; Last active: {new Date(session.lastActive).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-card-bg border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Sign Out</p>
            <p className="text-xs text-text-muted">End your current session</p>
          </div>
          <button
            onClick={() => logout()}
            className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Security() {
  const { user, logout } = useAuth();
  const [showSessions, setShowSessions] = useState(false);

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
            <button className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors">
              Change Password
            </button>
          </div>
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

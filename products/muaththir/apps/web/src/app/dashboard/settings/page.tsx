'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { apiClient, type Profile } from '../../../lib/api-client';

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiClient.getProfile();
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      } catch (err) {
        setProfileError(
          err instanceof Error ? err.message : 'Failed to load profile'
        );
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');
    setProfileSaving(true);

    try {
      const updated = await apiClient.updateProfile({ name, email });
      setProfile(updated);
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Failed to update profile'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to change password'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile Information */}
      <form onSubmit={handleProfileSubmit} className="card space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Profile Information
        </h2>

        {profileError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {profileError}
          </div>
        )}
        {profileMessage && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {profileMessage}
          </div>
        )}

        {profileLoading ? (
          <div className="space-y-4">
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Subscription</label>
              <p className="text-sm text-slate-600">
                {profile?.subscriptionTier || 'free'} plan
              </p>
            </div>

            <div>
              <label className="label">Children</label>
              <p className="text-sm text-slate-600">
                {profile?.childCount ?? 0} child profile{profile?.childCount !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={profileSaving}
            >
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        )}
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit} className="card space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Change Password
        </h2>

        {passwordError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {passwordError}
          </div>
        )}
        {passwordMessage && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {passwordMessage}
          </div>
        )}

        <div>
          <label htmlFor="currentPassword" className="label">
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="label">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            className="input-field"
            placeholder="Min 8 characters, 1 uppercase, 1 number"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={passwordSaving}
        >
          {passwordSaving ? 'Changing...' : 'Change Password'}
        </button>
      </form>

      {/* Account Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Account Actions
        </h2>
        <button
          onClick={handleLogout}
          className="btn-secondary border-red-300 text-red-700 hover:bg-red-50 w-full"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

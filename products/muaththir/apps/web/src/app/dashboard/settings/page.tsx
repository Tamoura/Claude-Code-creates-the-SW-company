'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { apiClient, type Profile, type Child } from '../../../lib/api-client';

interface ChildHealthForm {
  medicalNotes: string;
  allergiesText: string;
  specialNeeds: string;
}

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

  // Children health state
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [healthForms, setHealthForms] = useState<Record<string, ChildHealthForm>>({});
  const [healthSaving, setHealthSaving] = useState(false);
  const [healthMessage, setHealthMessage] = useState('');
  const [healthError, setHealthError] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    const loadChildren = async () => {
      try {
        const res = await apiClient.getChildren(1, 50);
        if (!cancelled) {
          setChildren(res.data);
          // Initialize health forms for each child
          const forms: Record<string, ChildHealthForm> = {};
          res.data.forEach((child) => {
            forms[child.id] = {
              medicalNotes: child.medicalNotes || '',
              allergiesText: child.allergies ? child.allergies.join(', ') : '',
              specialNeeds: child.specialNeeds || '',
            };
          });
          setHealthForms(forms);
        }
      } catch {
        // Children load failure is non-critical
      } finally {
        if (!cancelled) setChildrenLoading(false);
      }
    };
    loadChildren();
    return () => { cancelled = true; };
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

  const handleHealthSave = async (childId: string) => {
    const form = healthForms[childId];
    if (!form) return;

    setHealthSaving(true);
    setHealthError('');
    setHealthMessage('');

    try {
      const allergies = form.allergiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const updated = await apiClient.updateChild(childId, {
        medicalNotes: form.medicalNotes || null,
        allergies: allergies.length > 0 ? allergies : null,
        specialNeeds: form.specialNeeds || null,
      });

      // Update local state
      setChildren((prev) =>
        prev.map((c) => (c.id === childId ? updated : c))
      );
      setEditingChildId(null);
      setHealthMessage(`Health info updated for ${updated.name}.`);
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : 'Failed to update health info'
      );
    } finally {
      setHealthSaving(false);
    }
  };

  const updateHealthForm = (childId: string, field: keyof ChildHealthForm, value: string) => {
    setHealthForms((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [field]: value,
      },
    }));
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
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {profileMessage}
          </div>
        )}

        {profileLoading ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse">
              <span className="sr-only">Loading profile...</span>
            </div>
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

      {/* Children Health Information */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Children Health Info
          </h2>
          <Link
            href="/onboarding/child"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Add Child
          </Link>
        </div>

        {healthError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {healthError}
          </div>
        )}
        {healthMessage && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {healthMessage}
          </div>
        )}

        {childrenLoading ? (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <div className="h-16 bg-slate-100 rounded-xl animate-pulse">
              <span className="sr-only">Loading children...</span>
            </div>
          </div>
        ) : children.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No child profiles yet.{' '}
            <Link href="/onboarding/child" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Add one
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            {children.map((child) => {
              const isEditing = editingChildId === child.id;
              const form = healthForms[child.id];
              const hasHealthData =
                child.medicalNotes ||
                (child.allergies && child.allergies.length > 0) ||
                child.specialNeeds;

              return (
                <div
                  key={child.id}
                  className="border border-slate-100 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {child.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {child.ageBand ? child.ageBand.replace(/_/g, ' ') : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingChildId(isEditing ? null : child.id)
                      }
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {isEditing ? 'Cancel' : 'Edit Health'}
                    </button>
                  </div>

                  {!isEditing ? (
                    // Display mode
                    hasHealthData ? (
                      <div className="space-y-1.5">
                        {child.medicalNotes && (
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-700">Medical:</span>{' '}
                            {child.medicalNotes}
                          </p>
                        )}
                        {child.allergies && child.allergies.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs font-medium text-slate-700">Allergies:</span>
                            {child.allergies.map((allergy) => (
                              <span
                                key={allergy}
                                className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full"
                              >
                                {allergy}
                              </span>
                            ))}
                          </div>
                        )}
                        {child.specialNeeds && (
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-700">Special Needs:</span>{' '}
                            {child.specialNeeds}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No health information recorded.
                      </p>
                    )
                  ) : (
                    // Edit mode
                    form && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label
                            htmlFor={`medical-${child.id}`}
                            className="label"
                          >
                            Medical Notes
                          </label>
                          <textarea
                            id={`medical-${child.id}`}
                            rows={2}
                            className="input-field resize-none"
                            placeholder="e.g., Asthma, uses inhaler"
                            value={form.medicalNotes}
                            onChange={(e) =>
                              updateHealthForm(
                                child.id,
                                'medicalNotes',
                                e.target.value
                              )
                            }
                            maxLength={1000}
                            disabled={healthSaving}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`allergies-${child.id}`}
                            className="label"
                          >
                            Allergies
                          </label>
                          <input
                            id={`allergies-${child.id}`}
                            type="text"
                            className="input-field"
                            placeholder="e.g., Peanuts, Dairy (comma-separated)"
                            value={form.allergiesText}
                            onChange={(e) =>
                              updateHealthForm(
                                child.id,
                                'allergiesText',
                                e.target.value
                              )
                            }
                            disabled={healthSaving}
                          />
                          <p className="mt-1 text-xs text-slate-400">
                            Separate multiple allergies with commas.
                          </p>
                        </div>

                        <div>
                          <label
                            htmlFor={`special-${child.id}`}
                            className="label"
                          >
                            Special Needs
                          </label>
                          <textarea
                            id={`special-${child.id}`}
                            rows={2}
                            className="input-field resize-none"
                            placeholder="e.g., ADHD - on medication"
                            value={form.specialNeeds}
                            onChange={(e) =>
                              updateHealthForm(
                                child.id,
                                'specialNeeds',
                                e.target.value
                              )
                            }
                            maxLength={1000}
                            disabled={healthSaving}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleHealthSave(child.id)}
                          className="btn-primary w-full text-sm py-2"
                          disabled={healthSaving}
                        >
                          {healthSaving ? 'Saving...' : 'Save Health Info'}
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
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

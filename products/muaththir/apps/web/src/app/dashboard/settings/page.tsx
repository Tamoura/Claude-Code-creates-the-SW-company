'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../hooks/useAuth';
import { apiClient, type Profile, type Child, type DashboardData } from '../../../lib/api-client';

interface ChildHealthForm {
  medicalNotes: string;
  allergiesText: string;
  specialNeeds: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

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

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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
      setProfileMessage(t('profileUpdated'));
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
      setPasswordError(t('passwordsMismatch'));
      return;
    }

    setPasswordSaving(true);

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPasswordMessage(t('passwordChanged'));
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
      setHealthMessage(t('healthUpdated', { name: updated.name }));
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

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError('');

    try {
      const childrenRes = await apiClient.getChildren(1, 50);
      const dashboards: (DashboardData | null)[] = await Promise.all(
        childrenRes.data.map(async (child) => {
          try {
            return await apiClient.getDashboard(child.id);
          } catch {
            return null;
          }
        })
      );

      const exportData = {
        exportedAt: new Date().toISOString(),
        children: childrenRes.data.map((child, index) => ({
          ...child,
          dashboard: dashboards[index],
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `muaththir-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t('exportError'));
    } finally {
      setExporting(false);
    }
  }, [t]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Profile Information */}
      <form onSubmit={handleProfileSubmit} className="card space-y-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('profileInfo')}
        </h2>

        {profileError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {profileError}
          </div>
        )}
        {profileMessage && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {profileMessage}
          </div>
        )}

        {profileLoading ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse">
              <span className="sr-only">{t('loadingProfile')}</span>
            </div>
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="label">
                {t('fullName')}
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
                {t('email')}
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
              <label className="label">{t('subscription')}</label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('plan', { tier: profile?.subscriptionTier || 'free' })}
              </p>
            </div>

            <div>
              <label className="label">{t('children')}</label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {profile?.childCount === 1 ? t('childCount', { count: profile.childCount }) : t('childCountPlural', { count: profile?.childCount ?? 0 })}
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={profileSaving}
            >
              {profileSaving ? tc('saving') : t('saveChanges')}
            </button>
          </>
        )}
      </form>

      {/* Children Health Information */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('childrenHealthInfo')}
          </h2>
          <Link
            href="/onboarding/child"
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            {t('addChild')}
          </Link>
        </div>

        {healthError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {healthError}
          </div>
        )}
        {healthMessage && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {healthMessage}
          </div>
        )}

        {childrenLoading ? (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse">
              <span className="sr-only">{t('loadingChildren')}</span>
            </div>
          </div>
        ) : children.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            {t('noChildProfiles')}{' '}
            <Link href="/onboarding/child" className="text-emerald-600 hover:text-emerald-700 font-medium">
              {t('addOne')}
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
                  className="border border-slate-100 dark:border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {child.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {child.ageBand ? child.ageBand.replace(/_/g, ' ') : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingChildId(isEditing ? null : child.id)
                      }
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                    >
                      {isEditing ? t('cancelEdit') : t('editHealth')}
                    </button>
                  </div>

                  {!isEditing ? (
                    // Display mode
                    hasHealthData ? (
                      <div className="space-y-1.5">
                        {child.medicalNotes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{t('medicalLabel')}</span>{' '}
                            {child.medicalNotes}
                          </p>
                        )}
                        {child.allergies && child.allergies.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('allergiesLabel')}</span>
                            {child.allergies.map((allergy) => (
                              <span
                                key={allergy}
                                className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full"
                              >
                                {allergy}
                              </span>
                            ))}
                          </div>
                        )}
                        {child.specialNeeds && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{t('specialNeedsLabel')}</span>{' '}
                            {child.specialNeeds}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {t('noHealthInfo')}
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
                            {t('medicalNotes')}
                          </label>
                          <textarea
                            id={`medical-${child.id}`}
                            rows={2}
                            className="input-field resize-none"
                            placeholder={t('medicalPlaceholder')}
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
                            {t('allergies')}
                          </label>
                          <input
                            id={`allergies-${child.id}`}
                            type="text"
                            className="input-field"
                            placeholder={t('allergiesPlaceholder')}
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
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {t('allergiesHint')}
                          </p>
                        </div>

                        <div>
                          <label
                            htmlFor={`special-${child.id}`}
                            className="label"
                          >
                            {t('specialNeeds')}
                          </label>
                          <textarea
                            id={`special-${child.id}`}
                            rows={2}
                            className="input-field resize-none"
                            placeholder={t('specialNeedsPlaceholder')}
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
                          {healthSaving ? tc('saving') : t('saveHealthInfo')}
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('changePassword')}
        </h2>

        {passwordError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {passwordError}
          </div>
        )}
        {passwordMessage && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {passwordMessage}
          </div>
        )}

        <div>
          <label htmlFor="currentPassword" className="label">
            {t('currentPassword')}
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
            {t('newPassword')}
          </label>
          <input
            id="newPassword"
            type="password"
            className="input-field"
            placeholder={t('newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            {t('confirmPassword')}
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
          {passwordSaving ? t('changingPassword') : t('changePasswordBtn')}
        </button>
      </form>

      {/* Export Data */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('exportTitle')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('exportDesc')}
        </p>

        {exportError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {exportError}
          </div>
        )}

        <button
          type="button"
          onClick={handleExport}
          className="btn-primary w-full"
          disabled={exporting}
        >
          {exporting ? t('exporting') : t('exportButton')}
        </button>
      </div>

      {/* Account Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('accountActions')}
        </h2>
        <button
          onClick={handleLogout}
          className="btn-secondary border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 w-full"
        >
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}

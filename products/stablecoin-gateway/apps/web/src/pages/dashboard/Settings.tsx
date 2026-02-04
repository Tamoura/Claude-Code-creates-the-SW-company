import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

// Constants
const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 12,
  PATTERNS: {
    UPPERCASE: /[A-Z]/,
    LOWERCASE: /[a-z]/,
    NUMBER: /\d/,
    SPECIAL: /[!@#$%^&*(),.?":{}|<>]/,
  },
} as const;

const DEFAULT_NOTIFICATIONS = {
  paymentReceived: true,
  paymentFailed: true,
  refundProcessed: true,
  weeklySummary: false,
} as const;

// Types
interface NotificationPreferences {
  paymentReceived: boolean;
  paymentFailed: boolean;
  refundProcessed: boolean;
  weeklySummary: boolean;
}

interface PasswordForm {
  current: string;
  new: string;
  confirm: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

// Components
function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer group">
      <span className="text-sm text-text-primary">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-card-border rounded-full peer-checked:bg-accent-blue transition-colors" />
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

// Utility functions
function validatePassword(pwd: string): PasswordValidation {
  return {
    minLength: pwd.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
    hasUppercase: PASSWORD_REQUIREMENTS.PATTERNS.UPPERCASE.test(pwd),
    hasLowercase: PASSWORD_REQUIREMENTS.PATTERNS.LOWERCASE.test(pwd),
    hasNumber: PASSWORD_REQUIREMENTS.PATTERNS.NUMBER.test(pwd),
    hasSpecial: PASSWORD_REQUIREMENTS.PATTERNS.SPECIAL.test(pwd),
  };
}

function getPasswordValidationError(validation: PasswordValidation): string | null {
  if (!validation.minLength) {
    return `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`;
  }
  if (!validation.hasUppercase) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!validation.hasLowercase) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!validation.hasNumber) {
    return 'Password must contain at least one number';
  }
  if (!validation.hasSpecial) {
    return 'Password must contain at least one special character';
  }
  return null;
}

// Main component
export default function Settings() {
  const { user } = useAuth();

  // State: Notifications
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [notificationsSaved, setNotificationsSaved] = useState(false);

  // State: Password
  const [password, setPassword] = useState<PasswordForm>({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // State: Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Handlers
  const handleSaveNotifications = () => {
    // TODO: Call API endpoint when available
    console.log('Saving notification preferences:', notifications);
    setNotificationsSaved(true);
    setTimeout(() => setNotificationsSaved(false), 3000);
  };

  const handlePasswordChange = (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validate passwords match
    if (password.new !== password.confirm) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password requirements
    const validation = validatePassword(password.new);
    const error = getPasswordValidationError(validation);

    if (error) {
      setPasswordError(error);
      return;
    }

    // TODO: Call API endpoint when available
    console.log('Updating password');
    setPasswordSuccess(true);
    setPassword({ current: '', new: '', confirm: '' });
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText === 'DELETE') {
      // TODO: Call API endpoint when available
      console.log('Deleting account');
      alert('Account deletion is not yet implemented');
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  // Computed values
  const memberSince = 'January 2026'; // TODO: Use actual creation date from user object

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Settings</h2>
        <p className="text-text-secondary">
          Manage your account and preferences
        </p>
      </div>

      {/* Account Information */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Email Address
            </label>
            <div className="text-sm text-text-primary bg-page-bg border border-card-border rounded-lg px-4 py-2.5">
              {user?.email || 'Not available'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Account Role
            </label>
            <div className="text-sm text-text-primary bg-page-bg border border-card-border rounded-lg px-4 py-2.5">
              {user?.role || 'MERCHANT'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Member Since
            </label>
            <div className="text-sm text-text-primary bg-page-bg border border-card-border rounded-lg px-4 py-2.5">
              {memberSince}
            </div>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Email Notifications</h3>
        <p className="text-sm text-text-secondary mb-4">
          Choose which email notifications you'd like to receive
        </p>

        <div className="space-y-1 divide-y divide-card-border">
          <Toggle
            checked={notifications.paymentReceived}
            onChange={(v) => setNotifications({ ...notifications, paymentReceived: v })}
            label="Payment received"
          />
          <Toggle
            checked={notifications.paymentFailed}
            onChange={(v) => setNotifications({ ...notifications, paymentFailed: v })}
            label="Payment failed"
          />
          <Toggle
            checked={notifications.refundProcessed}
            onChange={(v) => setNotifications({ ...notifications, refundProcessed: v })}
            label="Refund processed"
          />
          <Toggle
            checked={notifications.weeklySummary}
            onChange={(v) => setNotifications({ ...notifications, weeklySummary: v })}
            label="Weekly summary"
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveNotifications}
            className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
          >
            Save Preferences
          </button>
        </div>

        {notificationsSaved && (
          <div className="mt-4 text-sm text-accent-green">
            Preferences saved successfully
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Change Password</h3>
        <p className="text-sm text-text-secondary mb-4">
          Update your password to keep your account secure
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-text-secondary mb-1">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              className="w-full bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:border-accent-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })}
              className="w-full bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:border-accent-blue focus:outline-none"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              Must be at least 12 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              className="w-full bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:border-accent-blue focus:outline-none"
              required
            />
          </div>

          {passwordError && (
            <div className="text-sm text-red-400">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="text-sm text-accent-green">
              Password updated successfully
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-card-bg border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
        <p className="text-sm text-text-secondary mb-4">
          This will permanently delete your account and all associated data.
        </p>

        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-text-secondary mb-1">
                Type <span className="font-bold text-red-400">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                aria-label="Confirmation text"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full max-w-xs bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:border-red-400 focus:outline-none"
                placeholder="Type DELETE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Deletion
              </button>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Settings</h2>
        <p className="text-text-secondary">
          Manage your account and preferences
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-8">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Account Settings</h3>
        <p className="text-text-secondary text-sm">
          Account management features are coming soon. You'll be able to update your email, password, and notification preferences.
        </p>
      </div>
    </div>
  );
}

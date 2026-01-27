import ComingSoon from '../../components/ComingSoon';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">
          Manage your account, API keys, and webhook configuration
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
          <ComingSoon
            title="API Key Management"
            description="Generate and manage API keys for programmatic access to Stablecoin Gateway."
          />
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhooks</h3>
          <ComingSoon
            title="Webhook Configuration"
            description="Configure webhook endpoints to receive real-time payment notifications."
          />
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
          <ComingSoon
            title="Account Management"
            description="Update your email, password, and notification preferences."
          />
        </div>
      </div>
    </div>
  );
}

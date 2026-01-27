import ComingSoon from '../../components/ComingSoon';

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <ComingSoon
          title="Merchant Login"
          description="Authentication system coming soon. For now, the dashboard is accessible without login."
        />
        <div className="text-center mt-8">
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

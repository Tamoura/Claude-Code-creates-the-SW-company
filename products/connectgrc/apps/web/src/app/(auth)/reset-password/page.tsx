import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Reset Password
      </h1>
      <p className="text-gray-600 text-sm mb-6 text-center">
        Enter your new password below.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter new password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <button className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Reset Password
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 mt-6">
        <Link href="/login" className="text-accent hover:underline font-medium">
          Back to Sign In
        </Link>
      </p>
    </>
  );
}

import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Forgot Password
      </h1>
      <p className="text-gray-600 text-sm mb-6 text-center">
        Enter your email and we will send you a reset link.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <button className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Send Reset Link
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

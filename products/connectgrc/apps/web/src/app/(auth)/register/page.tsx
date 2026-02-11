import Link from 'next/link';

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Create Your Account
      </h1>
      <p className="text-gray-600 text-sm mb-6 text-center">
        Start your GRC career journey with ConnectGRC
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
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Create a strong password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            At least 8 characters with uppercase, lowercase, and a number.
          </p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <div>
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" className="rounded border-gray-300 mt-1" />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-accent hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-accent hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>
        <button className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Create Account
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}

import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Welcome Back
      </h1>
      <p className="text-gray-600 text-sm mb-6 text-center">
        Sign in to your ConnectGRC account
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
            placeholder="Enter your password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" className="rounded border-gray-300" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <button className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Sign In
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 mt-6">
        Do not have an account?{' '}
        <Link href="/register" className="text-accent hover:underline font-medium">
          Create one
        </Link>
      </p>
    </>
  );
}

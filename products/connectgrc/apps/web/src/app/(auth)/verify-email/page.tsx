import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <>
      <div className="text-center">
        <div className="w-16 h-16 bg-accent-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          We sent a verification link to your email address. Click the
          link to verify your account.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Or enter verification code
            </label>
            <input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-gray-900 tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
          <button className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
            Verify Email
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Did not receive the email?{' '}
          <button className="text-accent hover:underline font-medium">
            Resend
          </button>
        </p>
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 mt-2 inline-block">
          Back to Sign In
        </Link>
      </div>
    </>
  );
}

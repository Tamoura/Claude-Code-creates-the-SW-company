/**
 * Signup Page
 *
 * Handles new user registration with email and password.
 * Enforces password requirements and redirects to dashboard on success.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', test: (p: string) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.signup(email, password);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">SF</span>
            </div>
            <span className="text-lg font-bold text-text-primary">StableFlow</span>
          </Link>
          <h2 className="text-3xl font-bold text-text-primary">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Get started with your merchant dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg"
              role="alert"
            >
              <span className="block sm:inline text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                className="w-full px-3 py-2.5 bg-card-bg border border-card-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue text-sm"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-describedby="password-requirements"
                aria-invalid={error && !allRequirementsMet ? 'true' : 'false'}
                className="w-full px-3 py-2.5 bg-card-bg border border-card-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue text-sm"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-1">
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={error && !passwordsMatch && confirmPassword.length > 0 ? 'true' : 'false'}
                className="w-full px-3 py-2.5 bg-card-bg border border-card-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password requirements */}
          <div id="password-requirements" className="bg-card-bg border border-card-border rounded-lg p-4">
            <p className="text-xs font-medium text-text-secondary mb-2">Password requirements:</p>
            <ul className="space-y-1">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = req.test(password);
                return (
                  <li
                    key={req.label}
                    className={`text-xs flex items-center gap-1.5 ${
                      met ? 'text-accent-green' : 'text-text-muted'
                    }`}
                  >
                    <span>{met ? '\u2713' : '\u2022'}</span>
                    {req.label}
                  </li>
                );
              })}
            </ul>
            {confirmPassword.length > 0 && (
              <p
                className={`text-xs mt-2 ${
                  passwordsMatch ? 'text-accent-green' : 'text-red-400'
                }`}
              >
                {passwordsMatch ? '\u2713 Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {/* Terms of Service Consent */}
          <div className="flex items-start">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 w-4 h-4 text-pink-600 bg-card-bg border-card-border rounded focus:ring-pink-500 focus:ring-2"
              />
              <span className="text-sm text-text-secondary">
                I agree to the{' '}
                <a href="#" className="text-accent-pink hover:text-pink-400 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-accent-pink hover:text-pink-400 underline">
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !allRequirementsMet || !passwordsMatch || !agreedToTerms}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent-pink hover:text-pink-400">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

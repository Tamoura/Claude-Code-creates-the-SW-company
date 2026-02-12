'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // Error is set by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome Back</h1>
      <p className="text-gray-600 text-sm mb-6 text-center">Sign in to your ConnectGRC account</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6">
        Do not have an account?{' '}
        <Link href="/register" className="text-accent hover:underline font-medium">
          Create one
        </Link>
      </p>
    </>
  );
}

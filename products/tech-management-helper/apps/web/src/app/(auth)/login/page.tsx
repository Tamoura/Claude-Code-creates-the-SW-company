'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Login Page Component
 *
 * Form with email/password fields (non-functional for foundation)
 * Will be wired to NextAuth.js in later phase
 */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Wire to NextAuth in authentication phase
    console.log('Login attempt:', { email, password })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Logo/Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Tech Management Helper
        </h1>
        <p className="text-gray-600 mt-2">
          Sign in to your account
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="ml-2 text-sm text-gray-600">
              Remember me
            </span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary/90"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Sign In
        </button>
      </form>

      {/* Register Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="text-primary font-semibold hover:text-primary/90"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

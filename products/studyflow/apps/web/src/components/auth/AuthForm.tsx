'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'login' | 'signup';

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string, mode: Mode): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  } else if (mode === 'signup' && password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const errors = validate(email, password, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (isSignup) {
        await api.auth.signup(email.trim().toLowerCase(), password);
      } else {
        await api.auth.login(email.trim().toLowerCase(), password);
      }
      // Session cookie is now set; go to the dashboard.
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setFieldErrors({
            email: err.fieldErrors.email,
            password: err.fieldErrors.password,
          });
        }
        setFormError(
          err.detail ||
            err.message ||
            'Could not complete the request. Please try again.'
        );
      } else {
        setFormError('Unexpected error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />

      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete={isSignup ? 'new-password' : 'current-password'}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        hint={isSignup ? 'At least 8 characters.' : undefined}
        required
      />

      <Button type="submit" loading={submitting} className="w-full">
        {isSignup ? 'Create account' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {isSignup ? (
          <>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            New to StudyFlow?{' '}
            <Link
              href="/signup"
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

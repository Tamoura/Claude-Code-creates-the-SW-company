'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

export default function OnboardingChildPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.createChild({
        name,
        dateOfBirth,
        gender: gender ? (gender as 'male' | 'female') : undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create child profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Create Child Profile
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tell us about your child to personalise their development
            tracking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="child-name" className="label">
              Child&apos;s Name
            </label>
            <input
              id="child-name"
              type="text"
              required
              className="input-field"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="date-of-birth" className="label">
              Date of Birth
            </label>
            <input
              id="date-of-birth"
              type="date"
              required
              className="input-field"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="mt-1 text-xs text-slate-400">
              Used to determine age-appropriate milestones (ages 3-16).
            </p>
          </div>

          <fieldset>
            <legend className="label mb-2">Gender (optional)</legend>
            <div className="flex gap-3">
              {[
                { label: 'Boy', value: 'male' },
                { label: 'Girl', value: 'female' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    gender === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                  aria-pressed={gender === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!name.trim() || !dateOfBirth || isLoading}
          >
            {isLoading ? 'Creating Profile...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

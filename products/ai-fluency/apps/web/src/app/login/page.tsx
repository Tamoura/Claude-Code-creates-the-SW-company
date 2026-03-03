'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';


const loginSchema = z.object({
  email: z
    .string()
    .min(1, t('common.required'))
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, t('common.required'))
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login({ email: data.email, password: data.password });
      void router.push('/dashboard');
    } catch {
      setServerError(
        'Invalid email or password. Please check your credentials and try again.',
      );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('auth.login.title')}
          </h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-md bg-danger-50 border border-danger-200 p-3 text-sm text-danger-700"
              >
                {serverError}
              </div>
            )}

            <Input
              id="email"
              label={t('auth.login.email.label')}
              type="email"
              autoComplete="email"
              placeholder={t('auth.login.email.placeholder')}
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="password"
              label={t('auth.login.password.label')}
              type="password"
              autoComplete="current-password"
              placeholder={t('auth.login.password.placeholder')}
              required
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full"
              size="lg"
            >
              {t('auth.login.submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            {t('auth.login.no_account')}{' '}
            <Link
              href="/register"
              className="font-medium text-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded-sm"
            >
              {t('auth.login.register_link')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

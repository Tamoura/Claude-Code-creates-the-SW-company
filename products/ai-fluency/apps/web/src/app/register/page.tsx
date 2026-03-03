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

const registerSchema = z.object({
  name: z
    .string()
    .min(1, t('common.required'))
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, t('common.required'))
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, t('common.required'))
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      void router.push('/dashboard');
    } catch {
      setServerError(
        'Unable to create account. The email may already be in use.',
      );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('auth.register.title')}
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
              id="name"
              label={t('auth.register.name.label')}
              type="text"
              autoComplete="name"
              placeholder={t('auth.register.name.placeholder')}
              required
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              id="email"
              label={t('auth.register.email.label')}
              type="email"
              autoComplete="email"
              placeholder={t('auth.register.email.placeholder')}
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="password"
              label={t('auth.register.password.label')}
              type="password"
              autoComplete="new-password"
              placeholder={t('auth.register.password.placeholder')}
              required
              error={errors.password?.message}
              {...register('password')}
            />

            <p className="text-xs text-gray-500">
              Password must be at least 8 characters with an uppercase letter and a number.
            </p>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full"
              size="lg"
            >
              {t('auth.register.submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            {t('auth.register.has_account')}{' '}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded-sm"
            >
              {t('auth.register.login_link')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

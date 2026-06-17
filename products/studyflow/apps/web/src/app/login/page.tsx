import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Log in — StudyFlow',
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
    >
      <AuthForm mode="login" />
    </AuthCard>
  );
}

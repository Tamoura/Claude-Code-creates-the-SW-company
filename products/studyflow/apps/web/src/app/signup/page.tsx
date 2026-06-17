import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign up — StudyFlow',
};

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Choose subjects, set goals, and track your progress — free."
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}

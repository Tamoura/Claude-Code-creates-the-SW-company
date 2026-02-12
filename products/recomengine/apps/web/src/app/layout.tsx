import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/useAuth';

export const metadata: Metadata = {
  title: 'RecomEngine - AI Product Recommendations',
  description: 'B2B SaaS Product Recommendation Orchestrator for E-Commerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

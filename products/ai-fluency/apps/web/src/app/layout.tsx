import type { Metadata } from 'next';
import { SkipNav } from '@/components/layout/SkipNav';
import { Header } from '@/components/layout/Header';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI Fluency — Measure and Grow Your AI Skills',
    template: '%s | AI Fluency',
  },
  description:
    'AI Fluency assesses and develops your team\'s ability to work effectively with AI across four dimensions: Delegation, Description, Discernment, and Diligence.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3118',
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SkipNav />
        <Header />
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
      </body>
    </html>
  );
}

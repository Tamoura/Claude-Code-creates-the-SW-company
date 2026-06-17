import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Bold geometric display face for headlines (Sage Enterprise system).
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00786f',
};

export const metadata: Metadata = {
  title: 'StudyFlow — Discover subjects, set goals, track progress',
  description:
    'StudyFlow helps university students discover and choose subjects, set measurable study goals, and track their progress to stay on top of every term.',
  keywords: [
    'study planner',
    'university subjects',
    'study goals',
    'progress tracking',
    'student productivity',
  ],
  openGraph: {
    title: 'StudyFlow',
    description:
      'Discover subjects, set goals, and track your study progress.',
    type: 'website',
    siteName: 'StudyFlow',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

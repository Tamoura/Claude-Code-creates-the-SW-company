import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/useAuth';

export const metadata: Metadata = {
  title: 'Viral Content Scraper — Top 1% Content Ideas',
  description: 'Discover the top 1% of viral content ideas across social media. Real-time scraping, virality scoring, and trend analysis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

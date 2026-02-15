import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from '@/components/providers/ClientProviders';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'QDB One - Qatar Development Bank',
  description: 'Unified portal for Qatar Development Bank services',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>
          <AppShell>
            {children}
          </AppShell>
        </ClientProviders>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CTOaaS — AI-Powered CTO Advisory',
  description: 'Your trusted AI advisor for technology leadership decisions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

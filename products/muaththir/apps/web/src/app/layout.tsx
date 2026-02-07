import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Mu'aththir - Holistic Child Development",
  description:
    'Track and nurture your child across six dimensions: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, and Physical.',
  keywords: [
    'child development',
    'parenting',
    'Islamic education',
    'holistic development',
    'milestone tracking',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}

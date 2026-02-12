import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { getDirection } from '../i18n/config';
import type { Locale } from '../i18n/config';
import './globals.css';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

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
  icons: {
    icon: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Mu'aththir",
  },
  openGraph: {
    title: "Mu'aththir - Holistic Child Development",
    description:
      'Track and nurture your child across six dimensions: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, and Physical.',
    type: 'website',
    siteName: "Mu'aththir",
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Mu'aththir - Holistic Child Development",
    description:
      'Track and nurture your child across six dimensions.',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = getDirection(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('muaththir-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans dark:bg-slate-900 dark:text-white">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

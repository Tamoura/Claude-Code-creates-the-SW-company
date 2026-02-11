import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { getDirection } from '../i18n/config';
import type { Locale } from '../i18n/config';
import './globals.css';

export const dynamic = 'force-dynamic';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = getDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

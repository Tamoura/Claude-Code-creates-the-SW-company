import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConnectBPM',
  description:
    'Design, run and evidence your business processes — evidence-native BPM.',
};

/**
 * i18n / RTL (DEC-001, .claude/protocols/i18n.md):
 *   `lang` and `dir` are driven by the tenant/user locale once the locale
 *   resolver lands. Hard-coded here only until then. Every layout uses logical
 *   Tailwind utilities so the RTL flip needs no per-component work.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

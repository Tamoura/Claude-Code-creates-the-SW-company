import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Primary font: Arabic-first, covers Arabic + Latin glyphs
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: true,
});

// Supplementary font: Latin characters where IBM Plex Sans Arabic
// does not provide glyphs (e.g. code identifiers, brand names)
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "ConnectIn — شبكتك المهنية | Your Professional Network",
  description:
    "ConnectIn is the Arabic-first professional networking platform connecting talent across the MENA region.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${ibmPlexSansArabic.variable} ${inter.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <Providers>
          <div id="main-content">{children}</div>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArchForge — AI-Powered Enterprise Architecture",
  description:
    "ArchForge generates standards-compliant enterprise architecture artifacts (ArchiMate, C4, TOGAF) from natural language descriptions. Design, collaborate, and export professional architecture diagrams in seconds.",
  keywords: [
    "enterprise architecture",
    "ArchiMate",
    "C4 model",
    "TOGAF",
    "AI architecture",
    "diagram generation",
    "architecture modeling",
  ],
  authors: [{ name: "ArchForge" }],
  openGraph: {
    title: "ArchForge — AI-Powered Enterprise Architecture",
    description:
      "Generate standards-compliant EA artifacts from natural language. ArchiMate, C4, TOGAF — designed by AI, refined by you.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

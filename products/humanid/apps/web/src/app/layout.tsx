import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HumanID — Universal Digital Identity",
  description:
    "HumanID is a universal digital identity platform built on self-sovereign identity principles, verifiable credentials, and zero-knowledge proofs. Take control of your digital identity.",
  keywords: [
    "digital identity",
    "self-sovereign identity",
    "verifiable credentials",
    "zero-knowledge proofs",
    "decentralized identity",
    "SSI",
    "DID",
  ],
  authors: [{ name: "HumanID" }],
  openGraph: {
    title: "HumanID — Universal Digital Identity",
    description:
      "Take control of your digital identity with self-sovereign identity, verifiable credentials, and zero-knowledge proofs.",
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
      <body className={`${inter.className} min-h-screen bg-white text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}

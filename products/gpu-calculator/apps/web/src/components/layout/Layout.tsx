import { type ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout Component
 *
 * Provides consistent page structure with Header and Footer.
 * Used to wrap all pages for consistent UI.
 *
 * Accessibility:
 * - Semantic HTML structure (header, main, footer)
 * - Proper landmark regions
 * - Skip to main content support
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';

/**
 * Header component for the GPU Calculator
 * Contains logo, title, and navigation
 *
 * Navigation links:
 * - Calculator (home) - Main calculator interface
 * - Methodology - How calculations work
 * - About - Project information
 */
export function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
              AI GPU Usage Calculator
            </h1>
          </Link>
          <nav className="hidden md:flex space-x-6" aria-label="Main navigation">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Calculator
            </Link>
            <Link
              to="/methodology"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Methodology
            </Link>
            <Link
              to="/about"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

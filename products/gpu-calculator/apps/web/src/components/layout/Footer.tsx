import { Link } from 'react-router-dom';

/**
 * Footer component for the GPU Calculator
 * Shows last updated date and methodology link
 */
export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <div className="mb-2 md:mb-0">
            <p>
              Last Updated: <span className="font-medium">January 2025</span>
            </p>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/methodology"
              className="hover:text-gray-900 transition-colors"
            >
              Methodology
            </Link>
            <span className="text-gray-400">|</span>
            <a
              href="https://github.com/connectsw"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

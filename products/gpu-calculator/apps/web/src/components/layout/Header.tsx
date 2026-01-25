/**
 * Header component for the GPU Calculator
 * Contains logo, title, and navigation
 */
export function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              AI GPU Usage Calculator
            </h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a
              href="#methodology"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Methodology
            </a>
            <a
              href="#about"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
              {t('header.title')}
            </Link>
            <div className="flex items-center gap-4">
              <nav className="flex gap-8">
                <Link
                  to="/use-cases"
                  className={`${
                    isActive('/use-cases')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  } px-3 py-2 text-sm font-medium transition-colors`}
                >
                  {t('common.browse')}
                </Link>
                <Link
                  to="/compare"
                  className={`${
                    isActive('/compare')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  } px-3 py-2 text-sm font-medium transition-colors`}
                >
                  {t('common.compare')}
                </Link>
                <Link
                  to="/learning-path"
                  className={`${
                    isActive('/learning-path')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  } px-3 py-2 text-sm font-medium transition-colors`}
                >
                  {t('common.learningPath')}
                </Link>
                <Link
                  to="/quantum-sovereignty-arab-world"
                  className={`${
                    isActive('/quantum-sovereignty-arab-world')
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  } px-3 py-2 text-sm font-medium transition-colors`}
                >
                  {t('common.arabSovereignty')}
                </Link>
              </nav>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500 text-sm">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}

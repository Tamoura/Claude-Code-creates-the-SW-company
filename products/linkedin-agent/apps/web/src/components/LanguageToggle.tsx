'use client';

interface LanguageToggleProps {
  activeLanguage: 'ar' | 'en';
  onToggle: (language: 'ar' | 'en') => void;
}

export function LanguageToggle({ activeLanguage, onToggle }: LanguageToggleProps) {
  return (
    <div className="inline-flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
      <button
        onClick={() => onToggle('en')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          activeLanguage === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onToggle('ar')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          activeLanguage === 'ar'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
        dir="rtl"
      >
        العربية
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';

export function Header() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-100">LinkedIn Agent</h1>
        <span className="text-sm text-gray-500" dir="rtl">وكيل لينكدإن</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">AI Connected</span>
        </div>

        {/* Settings button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 py-2">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                API Configuration
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                Model Preferences
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                Language Settings
              </button>
              <hr className="my-1 border-gray-800" />
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                About
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

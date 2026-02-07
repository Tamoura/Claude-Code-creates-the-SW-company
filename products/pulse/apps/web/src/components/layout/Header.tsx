'use client';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between px-6">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)] relative"
          aria-label="View notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </button>
        <button
          className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center"
          aria-label="User profile menu"
        >
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400" aria-hidden="true">U</span>
        </button>
      </div>
    </header>
  );
}

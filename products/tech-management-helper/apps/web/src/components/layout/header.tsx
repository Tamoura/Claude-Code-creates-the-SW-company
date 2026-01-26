/**
 * Header Component
 *
 * Top navigation bar with user menu and actions
 */
export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        {/* Search or Page Title */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Dashboard
          </h2>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            aria-label="Notifications"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">
                U
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">User Name</p>
              <p className="text-xs text-gray-500">user@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

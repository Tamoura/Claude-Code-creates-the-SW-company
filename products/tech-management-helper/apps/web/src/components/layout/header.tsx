'use client';

import { useAuth } from '@/contexts/auth-context';

/**
 * Header Component
 *
 * Top navigation bar with user info and logout
 */
export default function Header() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'ANALYST':
        return 'bg-green-100 text-green-800';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        {/* Page Title */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Tech Management Helper
          </h2>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {getInitials(user.name)}
              </span>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

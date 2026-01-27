import { Outlet, NavLink } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Stablecoin Gateway</h1>
              <p className="text-sm text-gray-600">Merchant Dashboard</p>
            </div>
            <nav className="flex gap-6">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                Overview
              </NavLink>
              <NavLink
                to="/dashboard/payments"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                Payments
              </NavLink>
              <NavLink
                to="/dashboard/settings"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                Settings
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ProtectedRoute } from '@/components/auth/protected-route'

/**
 * Dashboard Layout
 *
 * Layout with sidebar navigation and header
 * Protected - requires authentication
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  )
}

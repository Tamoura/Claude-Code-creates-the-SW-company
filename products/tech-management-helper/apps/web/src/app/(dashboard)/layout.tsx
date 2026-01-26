import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

/**
 * Dashboard Layout
 *
 * Layout with sidebar navigation and header
 * Used for all authenticated dashboard pages
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}

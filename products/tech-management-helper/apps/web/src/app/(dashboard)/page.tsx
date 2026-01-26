/**
 * Dashboard Home Page
 *
 * Main dashboard with placeholder content for compliance overview
 * Will include:
 * - Compliance summary cards
 * - IT4IT value stream visualization
 * - Risk matrix
 * - Recent assessments
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of compliance status and key metrics
        </p>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* NIST CSF */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">NIST CSF</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">N</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">85%</p>
            <p className="text-sm text-gray-600">Compliance</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }} />
            </div>
          </div>
        </div>

        {/* ISO 27001 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">ISO 27001</h3>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-green-600">I</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">72%</p>
            <p className="text-sm text-gray-600">Compliance</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '72%' }} />
            </div>
          </div>
        </div>

        {/* COBIT */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">COBIT</h3>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-purple-600">C</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">68%</p>
            <p className="text-sm text-gray-600">Compliance</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '68%' }} />
            </div>
          </div>
        </div>

        {/* IT4IT */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">IT4IT</h3>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-orange-600">4</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">79%</p>
            <p className="text-sm text-gray-600">Compliance</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '79%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Risks</h3>
          <p className="text-3xl font-bold text-gray-900">42</p>
          <p className="text-sm text-red-600 mt-2">
            8 Critical • 12 High
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Controls</h3>
          <p className="text-3xl font-bold text-gray-900">156</p>
          <p className="text-sm text-green-600 mt-2">
            94% Implemented
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Assets Tracked</h3>
          <p className="text-3xl font-bold text-gray-900">1,247</p>
          <p className="text-sm text-blue-600 mt-2">
            99.2% Current
          </p>
        </div>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            IT4IT Value Stream Visualization
          </h3>
          <p className="text-gray-600">
            Coming soon: Interactive value stream diagram with compliance mapping
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Frameworks Page
 *
 * Placeholder for Framework Library
 * Will include NIST CSF, ISO 27001, COBIT, IT4IT
 */
export default function FrameworksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Framework Library</h1>
        <p className="text-gray-600 mt-1">
          View compliance requirements across frameworks
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600">
            Framework library with NIST CSF, ISO 27001, COBIT, and IT4IT will be available soon
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AppResourcesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Resource Hub
      </h1>
      <p className="text-gray-600 mb-8">
        Access curated GRC content, guides, and learning materials.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Resource Library
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Coming soon. Browse framework guides, certification prep
            materials, and bookmark your favorites.
          </p>
        </div>
      </div>
    </div>
  );
}

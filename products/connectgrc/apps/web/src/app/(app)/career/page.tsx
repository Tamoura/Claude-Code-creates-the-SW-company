export default function CareerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Career Simulator
      </h1>
      <p className="text-gray-600 mb-8">
        Explore career paths and get personalized guidance.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Career Simulator
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Coming soon. Simulate career paths, get certification ROI
            analysis, and chat with an AI career counselor.
          </p>
        </div>
      </div>
    </div>
  );
}

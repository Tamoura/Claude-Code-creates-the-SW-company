export default function AssessmentPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment</h1>
      <p className="text-gray-600 mb-8">
        Take an AI-powered assessment to evaluate your GRC knowledge.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            GRC Assessment
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Coming soon. The voice-based assessment will evaluate your
            knowledge across six GRC domains with personalized feedback.
          </p>
        </div>
      </div>
    </div>
  );
}

const DOMAINS = [
  'Governance & Strategy',
  'Risk Management',
  'Compliance & Regulatory',
  'Information Security',
  'Audit & Assurance',
  'Business Continuity',
];

const DIFFICULTIES = ['Foundation', 'Intermediate', 'Advanced', 'Expert'];

export default function AdminQuestionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Question Management
      </h1>
      <p className="text-gray-600 mb-8">
        Manage assessment questions and golden answers.
      </p>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search questions..."
            disabled
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 w-64 disabled:bg-gray-50"
          />
          <select
            disabled
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          >
            <option>All Domains</option>
            {DOMAINS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            disabled
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          >
            <option>All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <button
          disabled
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Create Question
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-6 gap-4 px-6 py-3 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="col-span-3">Question</div>
          <div>Domain</div>
          <div>Difficulty</div>
          <div>Actions</div>
        </div>
        <div className="px-6 py-12 text-center text-gray-500">
          No questions created yet. Create questions to populate the assessment
          question bank for each GRC domain.
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {DOMAINS.map((domain) => (
          <div
            key={domain}
            className="bg-white rounded-lg border border-gray-200 p-4 text-center"
          >
            <p className="text-2xl font-bold text-gray-300 mb-1">0</p>
            <p className="text-xs text-gray-500">{domain}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

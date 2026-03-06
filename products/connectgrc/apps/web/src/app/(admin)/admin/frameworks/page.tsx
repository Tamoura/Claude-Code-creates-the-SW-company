const GRC_FRAMEWORKS = [
  { name: 'ISO 27001', category: 'Information Security', controls: 93 },
  { name: 'NIST CSF', category: 'Cybersecurity', controls: 108 },
  { name: 'SOC 2', category: 'Trust Services', controls: 64 },
  { name: 'GDPR', category: 'Privacy', controls: 99 },
  { name: 'HIPAA', category: 'Healthcare', controls: 75 },
  { name: 'PCI DSS', category: 'Payment Security', controls: 78 },
];

export default function AdminFrameworksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Framework Management
      </h1>
      <p className="text-gray-600 mb-8">
        Manage GRC frameworks and their controls.
      </p>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search frameworks..."
            disabled
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 w-64 disabled:bg-gray-50"
          />
          <select
            disabled
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          >
            <option>All Categories</option>
            <option>Information Security</option>
            <option>Cybersecurity</option>
            <option>Privacy</option>
            <option>Healthcare</option>
          </select>
        </div>
        <button
          disabled
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Add Framework
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GRC_FRAMEWORKS.map((fw) => (
          <div
            key={fw.name}
            className="bg-white rounded-lg border border-gray-200 p-6 opacity-60"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{fw.name}</h3>
                <span className="text-xs text-gray-500">{fw.category}</span>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                Inactive
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {fw.controls} controls defined
            </p>
            <div className="flex gap-2">
              <button
                disabled
                className="text-xs text-primary font-medium disabled:opacity-50"
              >
                Configure
              </button>
              <button
                disabled
                className="text-xs text-gray-500 font-medium disabled:opacity-50"
              >
                View Controls
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Framework configuration requires backend integration. Add frameworks
          by activating them and mapping their controls to assessment domains.
        </p>
      </div>
    </div>
  );
}

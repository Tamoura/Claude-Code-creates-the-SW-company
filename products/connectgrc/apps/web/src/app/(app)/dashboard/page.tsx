export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Welcome to your ConnectGRC dashboard.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Professional Tier
          </h3>
          <p className="text-2xl font-bold text-primary">--</p>
          <p className="text-sm text-gray-400 mt-1">
            Complete an assessment to get placed
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Assessments Taken
          </h3>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-400 mt-1">
            No assessments yet
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Profile Completion
          </h3>
          <p className="text-2xl font-bold text-secondary">0%</p>
          <p className="text-sm text-gray-400 mt-1">
            Complete your profile to get started
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span>Complete your professional profile</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span>Take your first assessment</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span>Explore career paths in the simulator</span>
          </div>
        </div>
      </div>
    </div>
  );
}

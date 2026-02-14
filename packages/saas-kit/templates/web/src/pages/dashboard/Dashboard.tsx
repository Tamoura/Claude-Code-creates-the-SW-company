export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {{displayName}}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Your SaaS scaffold is ready. Start building!
          </p>
        </div>
      </div>
    </div>
  );
}

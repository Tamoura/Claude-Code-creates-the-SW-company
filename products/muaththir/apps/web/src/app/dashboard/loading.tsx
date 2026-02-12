export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl"
          />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="card h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
}

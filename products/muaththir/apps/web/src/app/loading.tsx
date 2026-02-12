export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-emerald-600 border-r-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Loading...</p>
      </div>
    </div>
  );
}

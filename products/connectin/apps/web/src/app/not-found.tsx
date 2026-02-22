/**
 * Custom 404 page (Server Component — no providers needed).
 * Next.js prerenders this at build time; it renders inside the root layout
 * so it has access to fonts/styles but must not call any client hooks
 * that depend on context at module initialization time.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-3 text-5xl font-bold text-slate-900 dark:text-slate-100">
        404
      </h1>
      <h2 className="mb-4 text-xl font-semibold text-slate-700 dark:text-slate-300">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href="/"
        className="rounded-lg bg-[#0B6E7F] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#086577]"
      >
        Go home
      </a>
    </div>
  );
}

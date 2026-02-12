import Link from 'next/link';

interface ComingSoonProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ComingSoon({
  title,
  description = 'This feature is being developed and will be available soon.',
  backHref = '/dashboard',
  backLabel = 'Back to Dashboard',
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
        <svg
          className="h-8 w-8 text-slate-400 dark:text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
        {description}
      </p>
      <Link href={backHref} className="btn-secondary text-sm">
        {backLabel}
      </Link>
    </div>
  );
}

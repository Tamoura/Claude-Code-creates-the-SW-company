import Link from "next/link";

interface PlaceholderPageProps {
  title: string;
  description: string;
  backLink?: {
    href: string;
    label: string;
  };
}

export default function PlaceholderPage({
  title,
  description,
  backLink,
}: PlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Coming Soon Badge */}
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 mb-6">
          Coming Soon
        </span>

        {/* Icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>

        {/* Description */}
        <p className="text-gray-500 mb-8 leading-relaxed">{description}</p>

        {/* Back Link */}
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            {backLink.label}
          </Link>
        )}
      </div>
    </main>
  );
}

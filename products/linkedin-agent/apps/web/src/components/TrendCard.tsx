import Link from 'next/link';

interface TrendCardProps {
  topic: string;
  description: string;
  relevanceScore: number;
  suggestedAngles: string[];
  category: string;
}

export function TrendCard({ topic, description, relevanceScore, suggestedAngles, category }: TrendCardProps) {
  const scoreColor = relevanceScore >= 80
    ? 'text-green-400'
    : relevanceScore >= 60
      ? 'text-yellow-400'
      : 'text-gray-400';

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-700/50">
          {category}
        </span>
        <span className={`text-sm font-semibold ${scoreColor}`}>
          {relevanceScore}% relevant
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-100 mb-2">{topic}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>

      {suggestedAngles.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Suggested Angles
          </h4>
          <ul className="space-y-1.5">
            {suggestedAngles.map((angle, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {angle}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/posts/new?topic=${encodeURIComponent(topic)}`}
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Generate Post
      </Link>
    </div>
  );
}

import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { FormatBadge } from './FormatBadge';

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  contentAr: string | null;
  contentEn: string | null;
  status: string;
  format: string;
  createdAt: string;
}

export function PostCard({ id, title, content, contentAr, contentEn, status, format, createdAt }: PostCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const preview = (contentEn || content || '').substring(0, 150);
  const languageLabel = contentAr && contentEn ? 'AR / EN' : contentAr ? 'العربية' : 'English';

  return (
    <Link href={`/posts/${id}`}>
      <div className="card hover:border-gray-700 hover:bg-gray-850 transition-all duration-200 cursor-pointer group h-full">
        <div className="flex items-start justify-between mb-3">
          <StatusBadge status={status} />
          <FormatBadge format={format} />
        </div>

        <h3 className="text-base font-semibold text-gray-100 mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
          {title}
        </h3>

        <p className="text-sm text-gray-400 mb-4 line-clamp-3">
          {preview}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-800">
          <span>{languageLabel}</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </Link>
  );
}

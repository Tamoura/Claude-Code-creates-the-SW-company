import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { FormatBadge } from './FormatBadge';

interface PostCardProps {
  id: string;
  title: string;
  preview: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  format: 'text' | 'carousel' | 'infographic' | 'video-script' | 'poll';
  language: 'ar' | 'en' | 'both';
  createdAt: string;
}

const languageLabels = {
  ar: 'العربية',
  en: 'English',
  both: 'AR / EN',
};

export function PostCard({ id, title, preview, status, format, language, createdAt }: PostCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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
          <span>{languageLabels[language]}</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </Link>
  );
}

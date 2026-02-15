'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { FormatBadge } from '@/components/FormatBadge';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CarouselPreview } from '@/components/CarouselPreview';

interface PostDetail {
  id: string;
  title: string;
  contentEnglish: string;
  contentArabic: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  format: 'text' | 'carousel' | 'infographic' | 'video-script' | 'poll';
  formatReasoning: string;
  language: 'ar' | 'en' | 'both';
  tone: string;
  targetAudience: string;
  hashtags: string[];
  carousel?: {
    slides: Array<{
      slideNumber: number;
      title: string;
      content: string;
      speakerNotes?: string;
    }>;
  };
  supportingMaterials?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<'ar' | 'en'>('en');
  const [copied, setCopied] = useState(false);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);

  useEffect(() => {
    async function loadPost() {
      try {
        const data = await apiFetch<PostDetail>(`/api/posts/${params.id}`);
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadPost();
    }
  }, [params.id]);

  async function handleCopyToClipboard() {
    if (!post) return;
    const content = activeLanguage === 'en' ? post.contentEnglish : post.contentArabic;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleMarkPublished() {
    if (!post) return;
    try {
      await apiFetch(`/api/posts/${post.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
      });
      setPost({ ...post, status: 'published' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleGenerateCarousel() {
    if (!post) return;
    setGeneratingCarousel(true);
    try {
      const data = await apiFetch<PostDetail>(`/api/posts/${post.id}/carousel`, {
        method: 'POST',
      });
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate carousel');
    } finally {
      setGeneratingCarousel(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="card animate-pulse">
          <div className="w-48 h-7 bg-gray-800 rounded mb-4" />
          <div className="w-full h-4 bg-gray-800 rounded mb-2" />
          <div className="w-3/4 h-4 bg-gray-800 rounded mb-2" />
          <div className="w-1/2 h-4 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-900/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-gray-300 font-medium mb-1">Post not found</h3>
          <p className="text-sm text-gray-500 mb-4">{error || 'This post does not exist or has been deleted.'}</p>
          <button onClick={() => router.push('/posts')} className="btn-primary">
            Back to Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={post.status} />
            <FormatBadge format={post.format} />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">{post.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle activeLanguage={activeLanguage} onToggle={setActiveLanguage} />
        </div>
      </div>

      {/* Content - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* English */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3">English</h3>
          <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
            {post.contentEnglish}
          </div>
        </div>

        {/* Arabic */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3" dir="rtl">العربية</h3>
          <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed" dir="rtl">
            {post.contentArabic}
          </div>
        </div>
      </div>

      {/* Format recommendation */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Format Recommendation</h3>
        <div className="flex items-center gap-2 mb-2">
          <FormatBadge format={post.format} />
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{post.formatReasoning}</p>
      </div>

      {/* Carousel preview */}
      {post.carousel && post.carousel.slides.length > 0 && (
        <CarouselPreview slides={post.carousel.slides} title="Carousel Slides" />
      )}

      {/* Supporting materials */}
      {post.supportingMaterials && post.supportingMaterials.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Supporting Material Suggestions</h3>
          <ul className="space-y-2">
            {post.supportingMaterials.map((material, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {material}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Hashtags</h3>
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((tag, i) => (
              <span key={i} className="text-sm text-blue-400 bg-blue-900/20 px-3 py-1 rounded-lg">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/posts/new?topic=${encodeURIComponent(post.title)}`)}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit / Refine
          </button>

          <button
            onClick={handleCopyToClipboard}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>

          {!post.carousel && (
            <button
              onClick={handleGenerateCarousel}
              disabled={generatingCarousel}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              {generatingCarousel ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Generate Carousel
                </>
              )}
            </button>
          )}

          {post.status !== 'published' && (
            <button
              onClick={handleMarkPublished}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark as Published
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

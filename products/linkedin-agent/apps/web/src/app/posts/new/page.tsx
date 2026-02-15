'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { CarouselPreview } from '@/components/CarouselPreview';
import { FormatBadge } from '@/components/FormatBadge';

interface GeneratedPost {
  id: string;
  contentEnglish: string;
  contentArabic: string;
  format: 'text' | 'carousel' | 'infographic' | 'video-script' | 'poll';
  formatReasoning: string;
  hashtags: string[];
  carousel?: {
    slides: Array<{
      slideNumber: number;
      title: string;
      content: string;
      speakerNotes?: string;
    }>;
  };
}

export default function NewPostPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto">
        <div className="card animate-pulse py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-xl" />
          <div className="w-48 h-5 mx-auto bg-gray-800 rounded" />
        </div>
      </div>
    }>
      <NewPostContent />
    </Suspense>
  );
}

function NewPostContent() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [language, setLanguage] = useState<'ar' | 'en' | 'both'>('both');
  const [tone, setTone] = useState<'professional' | 'casual' | 'thought-leader' | 'educational'>('professional');
  const [audience, setAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);
  const [result, setResult] = useState<GeneratedPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedEnglish, setEditedEnglish] = useState('');
  const [editedArabic, setEditedArabic] = useState('');

  useEffect(() => {
    if (result) {
      setEditedEnglish(result.contentEnglish);
      setEditedArabic(result.contentArabic);
    }
  }, [result]);

  async function handleGenerate() {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiFetch<GeneratedPost>('/api/posts/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          language,
          tone,
          targetAudience: audience.trim() || undefined,
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate post');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCarousel() {
    if (!result) return;

    setGeneratingCarousel(true);
    try {
      const data = await apiFetch<GeneratedPost>(`/api/posts/${result.id}/carousel`, {
        method: 'POST',
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate carousel');
    } finally {
      setGeneratingCarousel(false);
    }
  }

  async function handleSaveEdits() {
    if (!result) return;

    try {
      await apiFetch(`/api/posts/${result.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          contentEnglish: editedEnglish,
          contentArabic: editedArabic,
        }),
      });
      setResult({ ...result, contentEnglish: editedEnglish, contentArabic: editedArabic });
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edits');
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Generate New Post</h1>
        <p className="text-sm text-gray-400 mt-1" dir="rtl">
          إنشاء منشور جديد بالذكاء الاصطناعي
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-200">Post Configuration</h2>

            {/* Topic */}
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1.5">
                Topic
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe the topic for your LinkedIn post..."
                className="textarea h-24"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['en', 'ar', 'both'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      language === lang
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'ar' ? 'العربية' : 'Both'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Tone
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'professional', label: 'Professional' },
                  { value: 'casual', label: 'Casual' },
                  { value: 'thought-leader', label: 'Thought Leader' },
                  { value: 'educational', label: 'Educational' },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      tone === t.value
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="audience" className="block text-sm font-medium text-gray-300 mb-1.5">
                Target Audience <span className="text-gray-500">(optional)</span>
              </label>
              <input
                id="audience"
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., GRC professionals, tech leaders, startup founders..."
                className="input"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating with AI...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Post
                </>
              )}
            </button>
          </div>

          {/* Format recommendation */}
          {result && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-gray-300">Format Recommendation</h3>
                <FormatBadge format={result.format} />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{result.formatReasoning}</p>

              {result.format === 'carousel' && !result.carousel && (
                <button
                  onClick={handleGenerateCarousel}
                  disabled={generatingCarousel}
                  className="btn-primary mt-4 inline-flex items-center gap-2 text-sm"
                >
                  {generatingCarousel ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating Carousel...
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

              {/* Hashtags */}
              {result.hashtags && result.hashtags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Suggested Hashtags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {result ? (
            <>
              {/* English content */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">English Content</h3>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {editMode ? 'Cancel Edit' : 'Edit'}
                  </button>
                </div>
                {editMode ? (
                  <textarea
                    value={editedEnglish}
                    onChange={(e) => setEditedEnglish(e.target.value)}
                    className="textarea h-48"
                  />
                ) : (
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {result.contentEnglish}
                  </div>
                )}
              </div>

              {/* Arabic content */}
              <div className="card">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Arabic Content</h3>
                {editMode ? (
                  <textarea
                    value={editedArabic}
                    onChange={(e) => setEditedArabic(e.target.value)}
                    className="textarea h-48"
                    dir="rtl"
                  />
                ) : (
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed" dir="rtl">
                    {result.contentArabic}
                  </div>
                )}
              </div>

              {editMode && (
                <button onClick={handleSaveEdits} className="btn-primary w-full">
                  Save Edits
                </button>
              )}

              {/* Carousel preview */}
              {result.carousel && (
                <CarouselPreview slides={result.carousel.slides} title="Carousel Preview" />
              )}
            </>
          ) : (
            <div className="card text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-gray-300 font-medium mb-1">Preview Area</h3>
              <p className="text-sm text-gray-500">
                Configure your post and click Generate to see the AI-created content here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

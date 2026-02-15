'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { documents, searchDocuments } from '@/data/documents';

export default function DocumentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;

  const displayedDocuments = searchQuery ? searchDocuments(searchQuery) : documents;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const portalColor: Record<string, string> = {
    financing: 'var(--primary)',
    guarantee: 'var(--warning)',
    advisory: 'var(--success)',
  };

  const portalLabel: Record<string, { en: string; ar: string }> = {
    financing: { en: 'Financing', ar: 'التمويل' },
    guarantee: { en: 'Guarantees', ar: 'الضمانات' },
    advisory: { en: 'Advisory', ar: 'الاستشارات' },
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Documents', 'المستندات')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t('All your documents across portals', 'جميع مستنداتك عبر البوابات')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
        <input
          type="text"
          placeholder={t('Search documents...', 'البحث في المستندات...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
        />
      </div>

      {/* Documents Table */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">
            {t(
              `${displayedDocuments.length} document(s) found`,
              `${displayedDocuments.length} مستند`
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--border)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Name', 'الاسم')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Type', 'النوع')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Source Portal', 'البوابة المصدرية')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Date', 'التاريخ')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Size', 'الحجم')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {displayedDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                    {t('No documents found', 'لا توجد مستندات')}
                  </td>
                </tr>
              ) : (
                displayedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        {t(doc.name, doc.nameAr)}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">{doc.type}</td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/${doc.sourcePortal}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: `${portalColor[doc.sourcePortal]}20`,
                          color: portalColor[doc.sourcePortal],
                        }}
                      >
                        {t(portalLabel[doc.sourcePortal].en, portalLabel[doc.sourcePortal].ar)}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">{doc.size}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { documents, searchDocuments } from '@/data/documents';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';

export default function MobileDocumentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;

  const displayedDocuments = searchQuery ? searchDocuments(searchQuery) : documents;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const portalColor: Record<string, string> = {
    financing: 'var(--primary)',
    guarantee: 'var(--warning)',
    advisory: 'var(--success)',
  };

  const portalLabel: Record<string, { en: string; ar: string }> = {
    financing: { en: 'Financing', ar: '\u0627\u0644\u062A\u0645\u0648\u064A\u0644' },
    guarantee: { en: 'Guarantees', ar: '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A' },
    advisory: { en: 'Advisory', ar: '\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A' },
  };

  return (
    <div>
      <MobileHeader title={t('Documents', '\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A')} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <input
          type="text"
          placeholder={t('Search documents...', '\u0627\u0644\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm bg-[var(--card-bg)]"
        />

        <p className="text-xs text-[var(--muted)]">
          {t(`${displayedDocuments.length} document(s)`, `${displayedDocuments.length} \u0645\u0633\u062A\u0646\u062F`)}
        </p>

        {displayedDocuments.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">{t('No documents found', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A')}</p>
        ) : (
          displayedDocuments.map(doc => (
            <MobileCard key={doc.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--foreground)] truncate">{t(doc.name, doc.nameAr)}</div>
                  <div className="text-[10px] text-[var(--muted)] mt-0.5">{doc.type} · {doc.size} · {formatDate(doc.uploadedAt)}</div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ml-2 flex-shrink-0"
                  style={{ backgroundColor: `${portalColor[doc.sourcePortal]}20`, color: portalColor[doc.sourcePortal] }}
                >
                  {t(portalLabel[doc.sourcePortal].en, portalLabel[doc.sourcePortal].ar)}
                </span>
              </div>
            </MobileCard>
          ))
        )}
      </div>
    </div>
  );
}

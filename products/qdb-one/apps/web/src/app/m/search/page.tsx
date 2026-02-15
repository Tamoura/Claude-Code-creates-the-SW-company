'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loans, loanApplications } from '@/data/financing';
import { guarantees } from '@/data/guarantees';
import { programs, advisorySessions } from '@/data/advisory';
import { searchDocuments } from '@/data/documents';
import MobileHeader from '@/components/mobile/MobileHeader';

interface SearchResult {
  id: string;
  title: string;
  titleAr: string;
  subtitle: string;
  portal: string;
  link: string;
}

function buildSearchResults(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  loans.forEach(l => {
    if (l.id.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)) {
      results.push({ id: l.id, title: `${l.type} \u2014 ${l.id}`, titleAr: `${l.type} \u2014 ${l.id}`, subtitle: `QAR ${l.outstandingBalance.toLocaleString()}`, portal: 'financing', link: `/m/financing/loans/${l.id}` });
    }
  });

  loanApplications.forEach(a => {
    if (a.id.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)) {
      results.push({ id: a.id, title: `Application: ${a.id}`, titleAr: `\u0637\u0644\u0628: ${a.id}`, subtitle: `QAR ${a.amount.toLocaleString()} \u00B7 ${a.status}`, portal: 'financing', link: `/m/financing/applications/${a.id}` });
    }
  });

  guarantees.forEach(g => {
    if (g.id.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.beneficiary.toLowerCase().includes(q)) {
      results.push({ id: g.id, title: `${g.type} \u2014 ${g.id}`, titleAr: `${g.type} \u2014 ${g.id}`, subtitle: `QAR ${g.amount.toLocaleString()} \u00B7 ${g.beneficiary}`, portal: 'guarantee', link: `/m/guarantees/${g.id}` });
    }
  });

  programs.forEach(p => {
    if (p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(query)) {
      results.push({ id: p.id, title: p.nameEn, titleAr: p.nameAr, subtitle: `${p.progress}% complete`, portal: 'advisory', link: `/m/advisory/programs/${p.id}` });
    }
  });

  advisorySessions.forEach(s => {
    if (s.topic.toLowerCase().includes(q) || s.advisorName.toLowerCase().includes(q)) {
      results.push({ id: s.id, title: s.topic, titleAr: s.topic, subtitle: `${s.advisorName} \u00B7 ${s.date}`, portal: 'advisory', link: `/m/advisory/sessions/${s.id}` });
    }
  });

  const docs = searchDocuments(query);
  docs.forEach(d => {
    results.push({ id: d.id, title: d.name, titleAr: d.nameAr, subtitle: `${d.type} \u00B7 ${d.size}`, portal: d.sourcePortal, link: `/m/documents` });
  });

  return results;
}

export default function MobileSearchPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  if (!user) return null;

  const results = query.length >= 2 ? buildSearchResults(query) : [];

  const portalIcon: Record<string, string> = { financing: '\u25C8', guarantee: '\u25C9', advisory: '\u25CE' };
  const portalColor: Record<string, string> = { financing: 'var(--primary)', guarantee: 'var(--warning)', advisory: 'var(--success)' };

  return (
    <div>
      <MobileHeader title={t('Search', '\u0627\u0644\u0628\u062D\u062B')} showBack />
      <div className="px-4 py-4">
        <input
          type="text"
          placeholder={t('Search across all portals...', '\u0627\u0644\u0628\u062D\u062B \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u0628\u0648\u0627\u0628\u0627\u062A...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm bg-[var(--card-bg)]"
        />
      </div>

      {query.length < 2 ? (
        <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t('Type at least 2 characters to search', '\u0627\u0643\u062A\u0628 \u062D\u0631\u0641\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0628\u062D\u062B')}
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t(`No results for "${query}"`, `\u0644\u0627 \u0646\u062A\u0627\u0626\u062C \u0644\u0640 "${query}"`)}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {results.map(result => (
            <Link
              key={`${result.portal}-${result.id}`}
              href={result.link}
              className="flex items-start gap-3 px-4 py-3 active:bg-gray-50 transition-colors"
            >
              <span className="text-base mt-0.5" style={{ color: portalColor[result.portal] }}>
                {portalIcon[result.portal]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{t(result.title, result.titleAr)}</p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">{result.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

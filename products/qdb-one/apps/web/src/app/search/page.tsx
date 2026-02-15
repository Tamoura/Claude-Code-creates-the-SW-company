'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loans, loanApplications } from '@/data/financing';
import { guarantees } from '@/data/guarantees';
import { programs, advisorySessions } from '@/data/advisory';
import { searchDocuments } from '@/data/documents';

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

  loans.forEach((l) => {
    if (l.id.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)) {
      results.push({
        id: l.id,
        title: `${l.type} — ${l.id}`,
        titleAr: `${l.type} — ${l.id}`,
        subtitle: `QAR ${l.outstandingBalance.toLocaleString()} outstanding · ${l.status}`,
        portal: 'financing',
        link: `/financing/loans/${l.id}`,
      });
    }
  });

  loanApplications.forEach((a) => {
    if (a.id.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)) {
      results.push({
        id: a.id,
        title: `Application: ${a.type} — ${a.id}`,
        titleAr: `طلب: ${a.type} — ${a.id}`,
        subtitle: `QAR ${a.amount.toLocaleString()} · ${a.status}`,
        portal: 'financing',
        link: `/financing/applications/${a.id}`,
      });
    }
  });

  guarantees.forEach((g) => {
    if (g.id.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.beneficiary.toLowerCase().includes(q)) {
      results.push({
        id: g.id,
        title: `${g.type} — ${g.id}`,
        titleAr: `${g.type} — ${g.id}`,
        subtitle: `QAR ${g.amount.toLocaleString()} · ${g.beneficiary} · ${g.status}`,
        portal: 'guarantee',
        link: `/guarantees/${g.id}`,
      });
    }
  });

  programs.forEach((p) => {
    if (p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(query)) {
      results.push({
        id: p.id,
        title: p.nameEn,
        titleAr: p.nameAr,
        subtitle: `${p.progress}% complete · ${p.status}`,
        portal: 'advisory',
        link: `/advisory/programs/${p.id}`,
      });
    }
  });

  advisorySessions.forEach((s) => {
    if (s.topic.toLowerCase().includes(q) || s.advisorName.toLowerCase().includes(q)) {
      results.push({
        id: s.id,
        title: s.topic,
        titleAr: s.topic,
        subtitle: `${s.advisorName} · ${s.date} · ${s.status}`,
        portal: 'advisory',
        link: `/advisory/sessions/${s.id}`,
      });
    }
  });

  const docs = searchDocuments(query);
  docs.forEach((d) => {
    results.push({
      id: d.id,
      title: d.name,
      titleAr: d.nameAr,
      subtitle: `${d.type} · ${d.sourcePortal} · ${d.size}`,
      portal: d.sourcePortal,
      link: `/documents/${d.id}`,
    });
  });

  return results;
}

export default function SearchPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  if (!user) return null;

  const results = query ? buildSearchResults(query) : [];

  const portalIcon: Record<string, string> = {
    financing: '◈',
    guarantee: '◉',
    advisory: '◎',
  };

  const portalColor: Record<string, string> = {
    financing: 'var(--primary)',
    guarantee: 'var(--warning)',
    advisory: 'var(--success)',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Search Results', 'نتائج البحث')}
        </h1>
        {query && (
          <p className="text-sm text-[var(--muted)] mt-1">
            {t(
              `${results.length} results for "${query}"`,
              `${results.length} نتيجة لـ "${query}"`
            )}
          </p>
        )}
      </div>

      {!query ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-12 text-center">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-[var(--muted)]">
            {t('Enter a search query in the header to search across all portals.', 'أدخل استعلام البحث في الشريط العلوي للبحث في جميع البوابات.')}
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-12 text-center">
          <p className="text-[var(--muted)]">
            {t(`No results found for "${query}"`, `لا توجد نتائج لـ "${query}"`)}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
          <div className="divide-y divide-[var(--border)]">
            {results.map((result) => (
              <Link
                key={`${result.portal}-${result.id}`}
                href={result.link}
                className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg mt-0.5" style={{ color: portalColor[result.portal] }}>
                  {portalIcon[result.portal]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {t(result.title, result.titleAr)}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">{result.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

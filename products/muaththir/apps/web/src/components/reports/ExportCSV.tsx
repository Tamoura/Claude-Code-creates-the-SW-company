'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '../../lib/api-client';

interface ExportCSVProps {
  childId: string;
  childName: string;
}

export default function ExportCSV({ childId, childName }: ExportCSVProps) {
  const t = useTranslations('reports');
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getObservations(childId, { limit: 1000 });
      const observations = response.data;

      // Generate CSV
      const headers = ['Date', 'Dimension', 'Content', 'Sentiment', 'Tags'];
      const rows = observations.map((obs) => [
        new Date(obs.observedAt).toLocaleDateString(),
        obs.dimension,
        `"${obs.content.replace(/"/g, '""')}"`, // Escape quotes
        obs.sentiment,
        obs.tags.join('; '),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];

      link.setAttribute('href', url);
      link.setAttribute('download', `${childName}-observations-${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label={t('downloadData')}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {isLoading ? t('downloadingCSV') : t('downloadCSV')}
    </button>
  );
}

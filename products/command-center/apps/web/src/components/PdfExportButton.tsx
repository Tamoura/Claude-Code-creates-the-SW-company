import { useState, useCallback } from 'react';

interface PdfExportButtonProps {
  /** Product name (URL slug) */
  productName: string;
  /** Document filename (e.g. "PRD.md" or "ADRs/ADR-001.md") */
  docFilename: string;
  /** Display title for the button tooltip */
  title?: string;
  /** Current theme for button styling */
  theme?: 'light' | 'dark';
  /** Optional className for the button */
  className?: string;
  /** Compact mode — icon only, no text */
  compact?: boolean;
}

export default function PdfExportButton({
  productName,
  docFilename,
  title: docTitle,
  theme = 'light',
  className = '',
  compact = false,
}: PdfExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      // Server-side PDF generation — handles any document size
      const res = await fetch(`/api/v1/products/${productName}/docs-pdf/${docFilename}`);

      if (!res.ok) {
        throw new Error(`PDF generation failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
        || `${productName}-${docFilename.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [productName, docFilename]);

  const isLight = theme === 'light';
  const baseStyles = isLight
    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
    : 'text-slate-400 hover:text-white hover:bg-slate-800';

  if (compact) {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`transition-colors p-1.5 rounded-lg ${baseStyles} ${exporting ? 'opacity-50 cursor-wait' : ''} ${className}`}
        title={exporting ? 'Generating PDF...' : `Download ${docTitle || 'document'} as PDF`}
      >
        {exporting ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${baseStyles} ${exporting ? 'opacity-50 cursor-wait' : ''} ${className}`}
      title={exporting ? 'Generating PDF...' : `Download ${docTitle || 'document'} as PDF`}
    >
      {exporting ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Generating...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>PDF</span>
        </>
      )}
    </button>
  );
}

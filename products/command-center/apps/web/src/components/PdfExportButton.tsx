import { useState, useCallback } from 'react';

interface PdfExportButtonProps {
  /** CSS selector or ref for the content element to capture */
  contentSelector: string;
  /** Filename for the downloaded PDF (without .pdf extension) */
  filename: string;
  /** Current theme — PDF always renders in light mode for print quality */
  theme?: 'light' | 'dark';
  /** Optional className for the button */
  className?: string;
  /** Compact mode — icon only, no text */
  compact?: boolean;
}

export default function PdfExportButton({
  contentSelector,
  filename,
  theme = 'light',
  className = '',
  compact = false,
}: PdfExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    const element = document.querySelector(contentSelector);
    if (!element) {
      console.error('PdfExportButton: content element not found:', contentSelector);
      return;
    }

    setExporting(true);

    try {
      // Dynamic import to avoid bundling html2pdf.js unless used
      const html2pdf = (await import('html2pdf.js')).default;

      // Clone the content to apply print-friendly styles without affecting the page
      const clone = element.cloneNode(true) as HTMLElement;

      // Force light background for PDF regardless of current theme
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#111827';
      clone.style.padding = '0';

      // Fix SVG diagrams for PDF rendering — ensure they have explicit dimensions
      const svgs = clone.querySelectorAll('svg');
      svgs.forEach((svg) => {
        if (!svg.getAttribute('width')) {
          const bbox = (element.querySelector(`svg[id="${svg.id}"]`) as SVGSVGElement)?.getBBox?.();
          if (bbox) {
            svg.setAttribute('width', String(Math.ceil(bbox.width + 20)));
            svg.setAttribute('height', String(Math.ceil(bbox.height + 20)));
          }
        }
      });

      // If in dark theme, restyle text colors in the clone for print
      if (theme === 'dark') {
        const allElements = clone.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const color = window.getComputedStyle(htmlEl).color;
          // Convert light-on-dark colors to dark-on-light
          if (color && (color.includes('rgb(255') || color.includes('rgb(209') || color.includes('rgb(156') || color.includes('rgb(229'))) {
            htmlEl.style.color = '#111827';
          }
        });
        // Fix table borders
        const tables = clone.querySelectorAll('table, th, td');
        tables.forEach((el) => {
          (el as HTMLElement).style.borderColor = '#d1d5db';
        });
        // Fix code blocks
        const codeBlocks = clone.querySelectorAll('pre');
        codeBlocks.forEach((el) => {
          el.style.backgroundColor = '#f3f4f6';
          el.style.color = '#111827';
        });
      }

      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_. ]/g, '_');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opt: any = {
        margin: [15, 15, 15, 15],
        filename: `${sanitizedFilename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          scrollY: 0,
          windowWidth: 900,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.pdf-page-break-before',
          after: '.pdf-page-break-after',
          avoid: ['table', 'figure', 'svg', 'pre', 'img'],
        },
      };

      await html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [contentSelector, filename, theme]);

  const isLight = theme === 'light';
  const baseStyles = isLight
    ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
    : 'text-gray-400 hover:text-white hover:bg-gray-800';

  if (compact) {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`transition-colors p-1.5 rounded-lg ${baseStyles} ${exporting ? 'opacity-50 cursor-wait' : ''} ${className}`}
        title={exporting ? 'Generating PDF...' : 'Download as PDF'}
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
      title={exporting ? 'Generating PDF...' : 'Download as PDF'}
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

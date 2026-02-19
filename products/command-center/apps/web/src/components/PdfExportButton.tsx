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

    let clone: HTMLElement | null = null;

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Clone and append to DOM — html2canvas requires an in-DOM element
      // with computed layout, otherwise it renders zero-size (empty PDF).
      clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '900px';
      clone.style.zIndex = '-1';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#111827';
      clone.style.padding = '24px';
      clone.removeAttribute('id'); // Avoid duplicate IDs
      document.body.appendChild(clone);

      // Give the browser a frame to compute layout
      await new Promise((r) => requestAnimationFrame(r));

      // Fix SVG diagrams — ensure all have explicit width/height for html2canvas
      const originalSvgs = element.querySelectorAll('svg');
      const cloneSvgs = clone.querySelectorAll('svg');
      cloneSvgs.forEach((svg, i) => {
        const origSvg = originalSvgs[i] as SVGSVGElement | undefined;
        if (!svg.getAttribute('width') || svg.getAttribute('width') === '100%') {
          // Use the original's bounding rect (it's in-DOM with real layout)
          const rect = origSvg?.getBoundingClientRect();
          if (rect && rect.width > 0) {
            svg.setAttribute('width', String(Math.ceil(rect.width)));
            svg.setAttribute('height', String(Math.ceil(rect.height)));
          }
        }
        svg.removeAttribute('id'); // Avoid duplicate IDs
      });

      // Force light-mode colors on all text for print readability
      const allEls = clone.querySelectorAll('*');
      allEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);

        // Convert any light-on-dark text to dark text
        const color = style.color;
        if (color) {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) {
            const [, r, g, b] = match.map(Number);
            // If text is light (for dark backgrounds), make it dark
            if (r > 150 && g > 150 && b > 150) {
              htmlEl.style.color = '#111827';
            }
          }
        }

        // Fix dark backgrounds
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          const bgMatch = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
          if (bgMatch) {
            const [, r, g, b] = bgMatch.map(Number);
            // Dark backgrounds → light
            if (r < 60 && g < 60 && b < 60) {
              htmlEl.style.backgroundColor = '#ffffff';
            }
          }
        }
      });

      // Fix table borders for print
      clone.querySelectorAll('table, th, td').forEach((el) => {
        (el as HTMLElement).style.borderColor = '#d1d5db';
      });

      // Fix code blocks
      clone.querySelectorAll('pre').forEach((el) => {
        el.style.backgroundColor = '#f3f4f6';
        el.style.color = '#111827';
      });

      // Fix inline code
      clone.querySelectorAll('code').forEach((el) => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const bgMatch = bg?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
        if (bgMatch) {
          const [, r, g, b] = bgMatch.map(Number);
          if (r < 60 && g < 60 && b < 60) {
            el.style.backgroundColor = '#f3f4f6';
            el.style.color = '#111827';
          }
        }
      });

      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_. ]/g, '_');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opt: any = {
        margin: [10, 10, 10, 10],
        filename: `${sanitizedFilename}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          scrollY: 0,
          windowWidth: 900,
          backgroundColor: '#ffffff',
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
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      setExporting(false);
    }
  }, [contentSelector, filename]);

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

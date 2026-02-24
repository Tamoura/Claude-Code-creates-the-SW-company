'use client';

// Renders a Mermaid diagram string to an inline SVG.
// Uses dynamic import to avoid SSR issues.
//
// Usage:
//   <MermaidRenderer diagram={artifact.mermaidDiagram} />

import { useEffect, useRef, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface MermaidRendererProps {
  diagram: string;
  className?: string;
}

let mermaidInitialized = false;

export default function MermaidRenderer({
  diagram,
  className = '',
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    let cancelled = false;

    const render = async () => {
      setIsRendering(true);
      setError(null);

      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, diagram);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Make the SVG responsive
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.maxWidth = '100%';
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to render diagram',
          );
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [diagram]);

  if (error) {
    return (
      <div className={`rounded-lg bg-red-50 border border-red-200 p-4 ${className}`}>
        <p className="text-sm font-medium text-red-700 mb-1">Diagram render error</p>
        <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono overflow-auto">
          {error}
        </pre>
        <details className="mt-3">
          <summary className="text-xs text-red-500 cursor-pointer">Show source</summary>
          <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-auto bg-gray-50 p-2 rounded">
            {diagram}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isRendering && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" label="Rendering diagram…" />
        </div>
      )}
      <div
        ref={containerRef}
        className={`w-full overflow-auto ${isRendering ? 'hidden' : ''}`}
        aria-label="Architecture diagram"
      />
    </div>
  );
}

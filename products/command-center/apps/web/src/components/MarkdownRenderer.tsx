import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import mermaid from 'mermaid';

let mermaidCounter = 0;

function initMermaid(theme: 'light' | 'dark') {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    flowchart: { useMaxWidth: true, htmlLabels: true },
    sequence: { useMaxWidth: true },
  });
}

// Initialize with default
initMermaid('dark');

function MermaidDiagram({ chart, theme }: { chart: string; theme: 'light' | 'dark' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const id = `mermaid-${++mermaidCounter}`;
    let cancelled = false;

    initMermaid(theme);
    mermaid.render(id, chart.trim()).then(
      ({ svg: renderedSvg }) => {
        if (!cancelled) { setSvg(renderedSvg); setError(''); }
      },
      (err) => {
        if (!cancelled) setError(String(err));
      },
    );

    return () => { cancelled = true; };
  }, [chart, theme]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-red-600 dark:text-red-400 text-sm mb-2">Failed to render diagram</p>
        <pre className="text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 flex justify-center">
        <span className="text-gray-400 dark:text-gray-500 text-sm">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 overflow-x-auto">
      <div
        ref={containerRef}
        className="flex justify-center [&>svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  theme?: 'light' | 'dark';
}

export default function MarkdownRenderer({ content, theme = 'dark' }: MarkdownRendererProps) {
  const dark = theme === 'dark';

  const components: Components = {
    h1: ({ children, id }) => (
      <h1 id={id as string | undefined} className={`text-3xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-20 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </h1>
    ),
    h2: ({ children, id }) => (
      <h2 id={id as string | undefined} className={`text-2xl font-bold mt-8 mb-3 scroll-mt-20 pb-2 border-b ${dark ? 'text-white border-gray-800' : 'text-gray-900 border-gray-200'}`}>
        {children}
      </h2>
    ),
    h3: ({ children, id }) => (
      <h3 id={id as string | undefined} className={`text-xl font-semibold mt-6 mb-3 scroll-mt-20 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </h3>
    ),
    h4: ({ children, id }) => (
      <h4 id={id as string | undefined} className={`text-lg font-semibold mt-5 mb-2 scroll-mt-20 ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
        {children}
      </h4>
    ),
    h5: ({ children, id }) => (
      <h5 id={id as string | undefined} className={`text-base font-semibold mt-4 mb-2 scroll-mt-20 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </h5>
    ),
    h6: ({ children, id }) => (
      <h6 id={id as string | undefined} className={`text-sm font-semibold mt-3 mb-2 scroll-mt-20 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
        {children}
      </h6>
    ),

    p: ({ children }) => (
      <p className={`leading-relaxed mb-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </p>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        className={`hover:underline transition-colors ${dark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    table: ({ children }) => (
      <div className={`overflow-x-auto my-6 rounded-lg border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className={`min-w-full divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={dark ? 'bg-gray-800' : 'bg-gray-50'}>
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => {
      const isHeader = (props as any).isHeader;
      return (
        <tr className={isHeader ? '' : (dark
          ? 'even:bg-gray-900/50 odd:bg-gray-900 hover:bg-gray-800/50 transition-colors'
          : 'even:bg-gray-50 odd:bg-white hover:bg-blue-50/50 transition-colors'
        )}>
          {children}
        </tr>
      );
    },
    th: ({ children }) => (
      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-white' : 'text-gray-700'}`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </td>
    ),

    pre: ({ children }) => {
      const child = children as ReactNode;
      if (child && typeof child === 'object' && 'props' in (child as any)) {
        const codeProps = (child as any).props;
        if (codeProps?.className?.includes('language-mermaid')) {
          const code = String(codeProps.children ?? '').replace(/\n$/, '');
          return <MermaidDiagram chart={code} theme={theme} />;
        }
      }
      return (
        <div className={`my-4 rounded-lg overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <pre className={`p-4 overflow-x-auto ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {children}
          </pre>
        </div>
      );
    },
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      if (lang) {
        return (
          <code className={`text-sm font-mono leading-relaxed whitespace-pre ${className ?? ''} ${dark ? 'text-gray-300' : 'text-gray-800'}`}>
            {children}
          </code>
        );
      }

      return (
        <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${dark ? 'bg-gray-800 text-blue-300' : 'bg-gray-100 text-blue-700'}`}>
          {children}
        </code>
      );
    },

    ul: ({ children }) => (
      <ul className={`list-disc list-inside space-y-2 mb-4 ml-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={`list-decimal list-inside space-y-2 mb-4 ml-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),

    blockquote: ({ children }) => (
      <blockquote className={`border-l-4 border-blue-500 pl-4 py-2 my-4 italic rounded-r ${dark ? 'text-gray-400 bg-gray-900/50' : 'text-gray-600 bg-blue-50/50'}`}>
        {children}
      </blockquote>
    ),

    hr: () => (
      <hr className={`my-8 ${dark ? 'border-gray-800' : 'border-gray-200'}`} />
    ),

    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt}
        className={`max-w-full h-auto rounded-lg border my-4 ${dark ? 'border-gray-700' : 'border-gray-200'}`}
      />
    ),

    strong: ({ children }) => (
      <strong className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className={`italic ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
        {children}
      </em>
    ),
  };

  return (
    <div className={`max-w-none ${dark ? 'prose prose-invert' : 'prose'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

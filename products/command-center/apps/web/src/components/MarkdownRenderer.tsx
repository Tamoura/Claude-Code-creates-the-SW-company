import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import mermaid from 'mermaid';

// ---------------------------------------------------------------------------
// Mermaid render queue — serializes render() calls to prevent race conditions.
// When a document has many diagrams (ConnectIn has up to 19 per file), calling
// mermaid.initialize() + mermaid.render() concurrently causes failures because
// mermaid's internal state is shared.
// ---------------------------------------------------------------------------

let mermaidCounter = 0;
let currentTheme: 'light' | 'dark' = 'dark';

function ensureMermaidTheme(theme: 'light' | 'dark') {
  if (currentTheme !== theme) {
    currentTheme = theme;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      sequence: { useMaxWidth: true },
    });
  }
}

// Initialize once at module load
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
});

type QueueItem = {
  id: string;
  chart: string;
  theme: 'light' | 'dark';
  resolve: (svg: string) => void;
  reject: (err: unknown) => void;
};

const renderQueue: QueueItem[] = [];
let rendering = false;

async function processQueue() {
  if (rendering) return;
  rendering = true;

  while (renderQueue.length > 0) {
    const item = renderQueue.shift()!;
    try {
      ensureMermaidTheme(item.theme);
      const { svg } = await mermaid.render(item.id, item.chart.trim());
      item.resolve(svg);
    } catch (err) {
      item.reject(err);
    }
    // Clean up any leftover temporary element mermaid may have created
    const tmp = document.getElementById(item.id);
    if (tmp) tmp.remove();
  }

  rendering = false;
}

function enqueueRender(chart: string, theme: 'light' | 'dark'): Promise<string> {
  const id = `mermaid-${++mermaidCounter}`;
  return new Promise<string>((resolve, reject) => {
    renderQueue.push({ id, chart, theme, resolve, reject });
    processQueue();
  });
}

// ---------------------------------------------------------------------------
// Wireframe detection — identifies ASCII wireframe art in unlabeled code blocks
// by looking for box-drawing patterns like +---+, |...|, etc.
// ---------------------------------------------------------------------------

function isWireframe(code: string): boolean {
  const lines = code.split('\n');
  if (lines.length < 4) return false;

  let boxLines = 0;
  for (const line of lines) {
    if (/^\s*[+|]/.test(line) || /[+|]\s*$/.test(line) || /\+-{3,}/.test(line)) {
      boxLines++;
    }
  }
  // If more than 40% of lines look like box-drawing, it's a wireframe
  return boxLines / lines.length > 0.4;
}

// ---------------------------------------------------------------------------
// asciiToBoxDrawing — converts ASCII wireframe characters (+, -, |) to
// proper Unicode box-drawing characters (┌, ─, │, etc.) by analyzing
// the surrounding context of each + junction.
// ---------------------------------------------------------------------------

function asciiToBoxDrawing(code: string): string {
  const lines = code.split('\n');
  // Pad all lines to equal length for safe neighbor lookups
  const maxLen = Math.max(...lines.map((l) => l.length));
  const grid = lines.map((l) => l.padEnd(maxLen).split(''));

  const isVert = (ch: string) => ch === '|' || ch === '+';
  const isHoriz = (ch: string) => ch === '-' || ch === '+';

  const junctionMap: Record<string, string> = {
    '0000': '+', // isolated (shouldn't happen)
    '0001': '─', '0010': '│', '0011': '└',
    '0100': '─', '0101': '─', '0110': '┘',
    '0111': '┴',
    '1000': '│', '1001': '┌', '1010': '│',
    '1011': '├',
    '1100': '┐', '1101': '┬', '1110': '┤',
    '1111': '┼',
  };

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === '+') {
        const down  = r + 1 < grid.length ? isVert(grid[r + 1][c]) : false;
        const right = c + 1 < grid[r].length ? isHoriz(grid[r][c + 1]) : false;
        const up    = r - 1 >= 0 ? isVert(grid[r - 1][c]) : false;
        const left  = c - 1 >= 0 ? isHoriz(grid[r][c - 1]) : false;
        const key = `${down ? 1 : 0}${right ? 1 : 0}${up ? 1 : 0}${left ? 1 : 0}`;
        grid[r][c] = junctionMap[key] || '┼';
      } else if (ch === '-') {
        grid[r][c] = '─';
      } else if (ch === '|') {
        grid[r][c] = '│';
      }
    }
  }

  return grid.map((row) => row.join('').trimEnd()).join('\n');
}

function WireframeBlock({ code, dark }: { code: string; dark: boolean }) {
  const rendered = asciiToBoxDrawing(code);

  return (
    <div className={`my-6 rounded-xl overflow-hidden border ${
      dark ? 'border-slate-600/50 bg-slate-900' : 'border-slate-300 bg-white'
    }`}>
      {/* Header bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b text-xs font-semibold tracking-wide uppercase ${
        dark
          ? 'bg-slate-800 border-slate-700 text-slate-400'
          : 'bg-slate-100 border-slate-200 text-slate-500'
      }`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Wireframe
      </div>
      {/* Blueprint-style wireframe content */}
      <div
        className="p-6 overflow-x-auto flex justify-center"
        style={{
          backgroundImage: dark
            ? 'radial-gradient(circle, rgba(100,116,139,0.15) 1px, transparent 1px)'
            : 'radial-gradient(circle, rgba(148,163,184,0.2) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      >
        <pre
          className={`text-[13px] leading-[1.35] whitespace-pre ${
            dark ? 'text-sky-300/80' : 'text-slate-600'
          }`}
          style={{ fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace" }}
        >
          {rendered}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MermaidDiagram — renders a single Mermaid chart via the serialized queue
// ---------------------------------------------------------------------------

function MermaidDiagram({ chart, theme }: { chart: string; theme: 'light' | 'dark' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    enqueueRender(chart, theme).then(
      (renderedSvg) => {
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

// ---------------------------------------------------------------------------
// extractText — recursively extracts text from React children.
// rehype-raw converts <br/> inside code blocks into actual React elements,
// breaking String(children). This function walks the tree and recovers the
// original text, converting <br> elements back to <br/> for Mermaid.
// ---------------------------------------------------------------------------

function extractText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in (node as any)) {
    const el = node as any;
    // Convert <br> elements back to <br/> text for Mermaid
    if (el.type === 'br' || el.props?.node?.tagName === 'br') return '<br/>';
    return extractText(el.props?.children);
  }
  return '';
}

// ---------------------------------------------------------------------------
// MarkdownRenderer
// ---------------------------------------------------------------------------

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

        // Mermaid diagrams
        if (codeProps?.className?.includes('language-mermaid')) {
          const code = extractText(codeProps.children).replace(/\n$/, '');
          return <MermaidDiagram chart={code} theme={theme} />;
        }

        // Wireframe detection for unlabeled code blocks
        if (!codeProps?.className) {
          const code = extractText(codeProps.children).replace(/\n$/, '');
          if (isWireframe(code)) {
            return <WireframeBlock code={code} dark={dark} />;
          }
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

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

// ---------------------------------------------------------------------------
// Wireframe tokenizer — parses box-drawn wireframe lines into typed segments
// so each element (input, button, icon, etc.) can be styled distinctly,
// producing a B&W form-like visual from ASCII art.
// ---------------------------------------------------------------------------

const BOX_CHARS = new Set('┌┐└┘├┤┬┴┼─│');

type WireTokenType =
  | 'border' | 'input' | 'button' | 'link' | 'icon'
  | 'radio' | 'checkbox' | 'toggle' | 'progress' | 'text';

interface WireToken { type: WireTokenType; raw: string; active?: boolean; pct?: number }

function tokenizeWireframeLine(line: string): WireToken[] {
  const tokens: WireToken[] = [];
  let i = 0;
  let buf = '';
  const flush = () => { if (buf) { tokens.push({ type: 'text', raw: buf }); buf = ''; } };

  while (i < line.length) {
    const ch = line[i];

    // Box-drawing characters
    if (BOX_CHARS.has(ch)) {
      flush();
      let j = i;
      while (j < line.length && BOX_CHARS.has(line[j])) j++;
      tokens.push({ type: 'border', raw: line.slice(i, j) });
      i = j; continue;
    }

    // Radio (*)
    if (ch === '(' && i + 2 < line.length && line[i + 1] === '*' && line[i + 2] === ')') {
      flush(); tokens.push({ type: 'radio', raw: '(*)', active: true }); i += 3; continue;
    }

    // Checkbox [x]
    if (ch === '[' && i + 2 < line.length && line[i + 1] === 'x' && line[i + 2] === ']') {
      flush(); tokens.push({ type: 'checkbox', raw: '[x]', active: true }); i += 3; continue;
    }

    // Toggle on [v ...]
    if (ch === '[' && i + 2 < line.length && line[i + 1] === 'v' && line[i + 2] === ' ') {
      const end = line.indexOf(']', i);
      if (end !== -1 && end - i < 15) {
        flush(); tokens.push({ type: 'toggle', raw: line.slice(i, end + 1), active: true });
        i = end + 1; continue;
      }
    }

    // Toggle off [  Off]
    if (ch === '[' && i + 1 < line.length && line[i + 1] === ' ') {
      const end = line.indexOf(']', i);
      if (end !== -1 && end - i < 15 && /^off$/i.test(line.slice(i + 1, end).trim())) {
        flush(); tokens.push({ type: 'toggle', raw: line.slice(i, end + 1), active: false });
        i = end + 1; continue;
      }
    }

    // Progress bar [===---]
    if (ch === '[') {
      const end = line.indexOf(']', i);
      if (end !== -1) {
        const inner = line.slice(i + 1, end);
        if (/^[=\- ]+$/.test(inner) && inner.includes('=') && inner.length > 3) {
          flush();
          const filled = (inner.match(/=/g) || []).length;
          const total = filled + (inner.match(/-/g) || []).length;
          tokens.push({ type: 'progress', raw: line.slice(i, end + 1), pct: total > 0 ? Math.round(filled / total * 100) : 0 });
          i = end + 1; continue;
        }
      }
    }

    // Input field {text}
    if (ch === '{') {
      const end = line.indexOf('}', i);
      if (end !== -1) { flush(); tokens.push({ type: 'input', raw: line.slice(i, end + 1) }); i = end + 1; continue; }
    }

    // Button [text]
    if (ch === '[') {
      const end = line.indexOf(']', i);
      if (end !== -1 && end - i < 60) { flush(); tokens.push({ type: 'button', raw: line.slice(i, end + 1) }); i = end + 1; continue; }
    }

    // Icon <text>
    if (ch === '<') {
      const end = line.indexOf('>', i);
      if (end !== -1 && end - i < 25 && !line.slice(i + 1, end).includes('<')) {
        flush(); tokens.push({ type: 'icon', raw: line.slice(i, end + 1) }); i = end + 1; continue;
      }
    }

    // Link (text) — more than 3 chars
    if (ch === '(') {
      const end = line.indexOf(')', i);
      if (end !== -1 && end - i > 3 && end - i < 50) {
        flush(); tokens.push({ type: 'link', raw: line.slice(i, end + 1) }); i = end + 1; continue;
      }
    }

    buf += ch; i++;
  }
  flush();
  return tokens;
}

// ---------------------------------------------------------------------------
// WireframeBlock — renders tokenized wireframe with B&W form styling
// ---------------------------------------------------------------------------

function WireframeBlock({ code, dark }: { code: string; dark: boolean }) {
  const boxDrawn = asciiToBoxDrawing(code);
  const lines = boxDrawn.split('\n');
  // Delimiter color — nearly invisible so brackets/braces fade out
  const dim = dark ? 'text-slate-700' : 'text-slate-300';

  function renderToken(t: WireToken, key: number) {
    switch (t.type) {
      case 'border':
        return <span key={key} className={dark ? 'text-slate-600' : 'text-slate-300'}>{t.raw}</span>;
      case 'input': {
        const inner = t.raw.slice(1, -1);
        return (
          <span key={key}>
            <span className={dim}>{t.raw[0]}</span>
            <span className={dark ? 'text-slate-300' : 'text-slate-700'}
              style={{ boxShadow: `inset 0 -1.5px 0 ${dark ? 'rgba(156,163,175,0.5)' : 'rgba(107,114,128,0.4)'}` }}>
              {inner}
            </span>
            <span className={dim}>{t.raw[t.raw.length - 1]}</span>
          </span>
        );
      }
      case 'button': {
        const inner = t.raw.slice(1, -1);
        return (
          <span key={key}>
            <span className={dim}>{t.raw[0]}</span>
            <span className={`font-semibold ${dark ? 'bg-slate-600 text-white' : 'bg-slate-800 text-white'}`}>{inner}</span>
            <span className={dim}>{t.raw[t.raw.length - 1]}</span>
          </span>
        );
      }
      case 'link': {
        const inner = t.raw.slice(1, -1);
        return (
          <span key={key}>
            <span className={dim}>{t.raw[0]}</span>
            <span className={`underline ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{inner}</span>
            <span className={dim}>{t.raw[t.raw.length - 1]}</span>
          </span>
        );
      }
      case 'icon': {
        const inner = t.raw.slice(1, -1);
        return (
          <span key={key}>
            <span className={dim}>{t.raw[0]}</span>
            <span className={`italic ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{inner}</span>
            <span className={dim}>{t.raw[t.raw.length - 1]}</span>
          </span>
        );
      }
      case 'radio':
        return <span key={key} className={`font-bold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{t.raw}</span>;
      case 'checkbox':
        return <span key={key} className={`font-bold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{t.raw}</span>;
      case 'toggle':
        return (
          <span key={key} className={`font-semibold ${
            t.active ? (dark ? 'bg-slate-500 text-white' : 'bg-slate-700 text-white') : (dark ? 'text-slate-600' : 'text-slate-400')
          }`}>{t.raw}</span>
        );
      case 'progress':
        return (
          <span key={key}>
            {[...t.raw].map((c, ci) => {
              if (c === '=') return <span key={ci} className={`font-bold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{c}</span>;
              if (c === '-') return <span key={ci} className={dark ? 'text-slate-700' : 'text-slate-300'}>{c}</span>;
              return <span key={ci} className={dim}>{c}</span>;
            })}
          </span>
        );
      default:
        return <span key={key}>{t.raw}</span>;
    }
  }

  return (
    <div className={`my-6 rounded-xl overflow-hidden border ${
      dark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'
    }`} style={{ boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b text-xs font-semibold tracking-wide uppercase ${
        dark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
      }`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Wireframe
      </div>
      <div className={`p-6 overflow-x-auto ${dark ? 'bg-slate-950' : 'bg-white'}`}>
        <div
          style={{ fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace", fontSize: '13px', lineHeight: 1.5 }}
          className={dark ? 'text-slate-300' : 'text-slate-700'}
        >
          {lines.map((ln, li) => (
            <div key={li} className="whitespace-pre">
              {tokenizeWireframeLine(ln).map((t, ti) => renderToken(t, ti))}
            </div>
          ))}
        </div>
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
      <div className="my-4 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 p-4">
        <p className="text-rose-600 dark:text-rose-400 text-sm mb-2">Failed to render diagram</p>
        <pre className="text-xs text-slate-500 dark:text-slate-400 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-8 flex justify-center">
        <span className="text-slate-400 dark:text-slate-500 text-sm">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg border border-gray-700 bg-gray-900 p-4 overflow-x-auto">
      <div
        ref={containerRef}
        className="flex justify-center [&>svg]:max-w-full [&>svg]:rounded-lg"
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
      <h1 id={id as string | undefined} className={`text-3xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-20 ${dark ? 'text-white' : 'text-slate-900'}`}>
        {children}
      </h1>
    ),
    h2: ({ children, id }) => (
      <h2 id={id as string | undefined} className={`text-2xl font-bold mt-8 mb-3 scroll-mt-20 pb-2 border-b ${dark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>
        {children}
      </h2>
    ),
    h3: ({ children, id }) => (
      <h3 id={id as string | undefined} className={`text-xl font-semibold mt-6 mb-3 scroll-mt-20 ${dark ? 'text-white' : 'text-slate-900'}`}>
        {children}
      </h3>
    ),
    h4: ({ children, id }) => (
      <h4 id={id as string | undefined} className={`text-lg font-semibold mt-5 mb-2 scroll-mt-20 ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
        {children}
      </h4>
    ),
    h5: ({ children, id }) => (
      <h5 id={id as string | undefined} className={`text-base font-semibold mt-4 mb-2 scroll-mt-20 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {children}
      </h5>
    ),
    h6: ({ children, id }) => (
      <h6 id={id as string | undefined} className={`text-sm font-semibold mt-3 mb-2 scroll-mt-20 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        {children}
      </h6>
    ),

    p: ({ children }) => (
      <p className={`leading-relaxed mb-4 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {children}
      </p>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        className={`hover:underline transition-colors ${dark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    table: ({ children }) => (
      <div className={`overflow-x-auto my-6 rounded-lg border ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
        <table className={`min-w-full divide-y ${dark ? 'divide-slate-700' : 'divide-slate-200'}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className={`divide-y ${dark ? 'divide-slate-700' : 'divide-slate-200'}`}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => {
      const isHeader = (props as any).isHeader;
      return (
        <tr className={isHeader ? '' : (dark
          ? 'even:bg-slate-900/50 odd:bg-slate-900 hover:bg-slate-800/50 transition-colors'
          : 'even:bg-slate-50 odd:bg-white hover:bg-indigo-50/50 transition-colors'
        )}>
          {children}
        </tr>
      );
    },
    th: ({ children }) => (
      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-white' : 'text-slate-700'}`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`px-4 py-3 text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
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
        <div className={`my-4 rounded-lg overflow-hidden border ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          <pre className={`p-4 overflow-x-auto ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
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
          <code className={`text-sm font-mono leading-relaxed whitespace-pre ${className ?? ''} ${dark ? 'text-slate-300' : 'text-slate-800'}`}>
            {children}
          </code>
        );
      }

      return (
        <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${dark ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-indigo-700'}`}>
          {children}
        </code>
      );
    },

    ul: ({ children }) => (
      <ul className={`list-disc list-inside space-y-2 mb-4 ml-4 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={`list-decimal list-inside space-y-2 mb-4 ml-4 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),

    blockquote: ({ children }) => (
      <blockquote className={`border-l-4 border-indigo-500 pl-4 py-2 my-4 italic rounded-r ${dark ? 'text-slate-400 bg-slate-900/50' : 'text-slate-600 bg-indigo-50/50'}`}>
        {children}
      </blockquote>
    ),

    hr: () => (
      <hr className={`my-8 ${dark ? 'border-slate-800' : 'border-slate-200'}`} />
    ),

    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt}
        className={`max-w-full h-auto rounded-lg border my-4 ${dark ? 'border-slate-700' : 'border-slate-200'}`}
      />
    ),

    strong: ({ children }) => (
      <strong className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className={`italic ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
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

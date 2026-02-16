import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components: Components = {
    // Headings with proper sizing and spacing
    h1: ({ children, id }) => (
      <h1 id={id as string | undefined} className="text-3xl font-bold text-white mt-8 mb-4 first:mt-0 scroll-mt-20">
        {children}
      </h1>
    ),
    h2: ({ children, id }) => (
      <h2 id={id as string | undefined} className="text-2xl font-bold text-white mt-8 mb-3 scroll-mt-20 border-b border-gray-800 pb-2">
        {children}
      </h2>
    ),
    h3: ({ children, id }) => (
      <h3 id={id as string | undefined} className="text-xl font-semibold text-white mt-6 mb-3 scroll-mt-20">
        {children}
      </h3>
    ),
    h4: ({ children, id }) => (
      <h4 id={id as string | undefined} className="text-lg font-semibold text-gray-200 mt-5 mb-2 scroll-mt-20">
        {children}
      </h4>
    ),
    h5: ({ children, id }) => (
      <h5 id={id as string | undefined} className="text-base font-semibold text-gray-300 mt-4 mb-2 scroll-mt-20">
        {children}
      </h5>
    ),
    h6: ({ children, id }) => (
      <h6 id={id as string | undefined} className="text-sm font-semibold text-gray-400 mt-3 mb-2 scroll-mt-20">
        {children}
      </h6>
    ),

    // Paragraphs
    p: ({ children }) => (
      <p className="text-gray-300 leading-relaxed mb-4">
        {children}
      </p>
    ),

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    // Tables - the star feature!
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-800">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-700">
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => {
      // Check if this is a header row by looking at the parent
      const isHeader = (props as any).isHeader;
      return (
        <tr className={isHeader ? '' : 'even:bg-gray-900/50 odd:bg-gray-900 hover:bg-gray-800/50 transition-colors'}>
          {children}
        </tr>
      );
    },
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-gray-300">
        {children}
      </td>
    ),

    // Code blocks - in react-markdown v10+, block code is wrapped in <pre><code>
    // so we style <pre> for blocks and <code> for inline
    pre: ({ children }) => (
      <div className="my-4 rounded-lg overflow-hidden border border-gray-700">
        <pre className="bg-gray-900 p-4 overflow-x-auto">
          {children}
        </pre>
      </div>
    ),
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      // If it has a language class, it's a block code element inside <pre>
      if (lang) {
        return (
          <code className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">
            {children}
          </code>
        );
      }

      // Inline code
      return (
        <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },

    // Lists
    ul: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300 ml-4">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-300 ml-4">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-gray-400 bg-gray-900/50 rounded-r">
        {children}
      </blockquote>
    ),

    // Horizontal rules
    hr: () => (
      <hr className="my-8 border-gray-800" />
    ),

    // Images
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg border border-gray-700 my-4"
      />
    ),

    // Strong and emphasis
    strong: ({ children }) => (
      <strong className="font-semibold text-white">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-gray-300">
        {children}
      </em>
    ),
  };

  return (
    <div className="prose prose-invert max-w-none">
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

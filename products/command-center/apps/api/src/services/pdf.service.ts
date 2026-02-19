import puppeteer, { type Browser } from 'puppeteer-core';
import { marked } from 'marked';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Reuse browser instance across requests for performance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  return browserInstance;
}

/** Generate a PDF buffer from markdown content */
export async function generatePdfFromMarkdown(
  markdown: string,
  title: string,
  productName: string,
): Promise<Buffer> {
  const htmlContent = await marked.parse(markdown, { gfm: true, breaks: false });

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} — ${escapeHtml(productName)}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    @page { margin: 15mm; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #111827;
      line-height: 1.7;
      font-size: 14px;
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
    }

    h1 { font-size: 28px; font-weight: 700; margin: 32px 0 16px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    h2 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 18px; font-weight: 600; margin: 24px 0 10px; color: #111827; }
    h4 { font-size: 16px; font-weight: 600; margin: 20px 0 8px; color: #374151; }
    h5 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; color: #4b5563; }
    h6 { font-size: 13px; font-weight: 600; margin: 12px 0 4px; color: #6b7280; }

    p { margin: 0 0 12px; color: #374151; }

    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }

    strong { font-weight: 600; color: #111827; }
    em { font-style: italic; color: #374151; }

    ul, ol { margin: 0 0 12px; padding-left: 24px; color: #374151; }
    li { margin-bottom: 4px; }

    blockquote {
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
      padding: 8px 16px;
      background: #eff6ff;
      color: #374151;
      border-radius: 0 4px 4px 0;
    }

    code {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
      font-size: 12px;
      background: #f3f4f6;
      color: #1e40af;
      padding: 2px 6px;
      border-radius: 4px;
    }

    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    pre code {
      background: none;
      padding: 0;
      color: #1e293b;
      font-size: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 13px;
      page-break-inside: avoid;
    }
    th {
      background: #f9fafb;
      border: 1px solid #d1d5db;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #111827;
    }
    td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      color: #374151;
    }
    tr:nth-child(even) td { background: #f9fafb; }

    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }

    img { max-width: 100%; height: auto; border-radius: 8px; }

    /* Mermaid diagram containers */
    .mermaid {
      text-align: center;
      margin: 16px 0;
      page-break-inside: avoid;
    }

    /* Print-specific */
    @media print {
      body { font-size: 12px; }
      h1 { font-size: 24px; }
      h2 { font-size: 19px; }
      h3 { font-size: 16px; }
      pre, table, .mermaid, figure, img { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${htmlContent}

  <script>
    // Initialize Mermaid diagrams
    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    // Find all code blocks with language-mermaid and render them
    document.querySelectorAll('code.language-mermaid').forEach((block, i) => {
      const pre = block.parentElement;
      if (!pre || pre.tagName !== 'PRE') return;
      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = block.textContent || '';
      pre.replaceWith(container);
    });

    // Also handle mermaid blocks that marked might output without language class
    document.querySelectorAll('pre > code').forEach((block) => {
      const text = (block.textContent || '').trim();
      if (text.startsWith('graph ') || text.startsWith('flowchart ') || text.startsWith('sequenceDiagram') ||
          text.startsWith('classDiagram') || text.startsWith('erDiagram') || text.startsWith('stateDiagram') ||
          text.startsWith('gantt') || text.startsWith('pie') || text.startsWith('gitgraph') ||
          text.startsWith('mindmap') || text.startsWith('C4')) {
        const pre = block.parentElement;
        if (!pre) return;
        const container = document.createElement('div');
        container.className = 'mermaid';
        container.textContent = text;
        pre.replaceWith(container);
      }
    });

    mermaid.run();
  </script>
</body>
</html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30_000 });

    // Wait for Mermaid to render all diagrams
    await page.evaluate(`
      new Promise((resolve) => {
        var check = function() {
          var pending = document.querySelectorAll('.mermaid:not([data-processed])');
          if (pending.length === 0) {
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        setTimeout(check, 500);
      })
    `);

    // Extra pause for SVG rendering to settle
    await new Promise((r) => setTimeout(r, 500));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 9px; color: #9ca3af; width: 100%; text-align: center; padding: 0 15mm;">
          <span>${escapeHtml(title)} — ${escapeHtml(productName)} | Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/** Clean up the browser instance on shutdown */
export async function closePdfBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

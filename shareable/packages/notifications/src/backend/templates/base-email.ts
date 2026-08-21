/**
 * Base email template utilities.
 *
 * Provides HTML escaping and a standard email wrapper.
 * Products can use buildEmailHtml() with their own body content.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface EmailTemplateOptions {
  /** Primary brand color. Default: '#2563eb' */
  brandColor?: string;
  /** Product name shown in footer. Default: 'ConnectSW' */
  productName?: string;
  /** Footer text. Default: auto-generated */
  footerText?: string;
}

/**
 * Wrap body content in a standard email HTML shell.
 */
export function buildEmailHtml(
  title: string,
  bodyHtml: string,
  opts?: EmailTemplateOptions,
): string {
  const brandColor = opts?.brandColor ?? '#2563eb';
  const productName = opts?.productName ?? 'ConnectSW';
  const footer = opts?.footerText ?? `This is an automated message from ${productName}.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .header h1 {
      color: ${brandColor};
      margin: 0;
      font-size: 24px;
    }
    .body { margin: 30px 0; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-label { color: #666; font-weight: 500; }
    .detail-value { color: #333; font-weight: 600; }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      color: #999;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      ${escapeHtml(footer)}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build a detail row for email templates.
 */
export function detailRow(label: string, value: string): string {
  return `<div class="detail-row"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(value)}</span></div>`;
}

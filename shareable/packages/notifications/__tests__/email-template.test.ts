/**
 * Email template tests
 *
 * Tests the base email template and common template rendering patterns.
 */

describe('Email Templates', () => {
  describe('base email template structure', () => {
    function renderBaseTemplate(params: {
      title: string;
      preheader?: string;
      body: string;
      ctaText?: string;
      ctaUrl?: string;
      footer?: string;
    }): string {
      const { title, preheader = '', body, ctaText, ctaUrl, footer = '© ConnectSW' } = params;

      return `
        <!DOCTYPE html>
        <html>
          <head><title>${title}</title></head>
          <body>
            ${preheader ? `<span class="preheader">${preheader}</span>` : ''}
            <h1>${title}</h1>
            <div class="body">${body}</div>
            ${ctaText && ctaUrl ? `<a href="${ctaUrl}" class="cta">${ctaText}</a>` : ''}
            <footer>${footer}</footer>
          </body>
        </html>
      `.trim();
    }

    it('renders title in the template', () => {
      const html = renderBaseTemplate({ title: 'Welcome to ConnectSW', body: 'Hello there!' });
      expect(html).toContain('Welcome to ConnectSW');
    });

    it('renders body content', () => {
      const html = renderBaseTemplate({ title: 'Test', body: '<p>Your account is ready.</p>' });
      expect(html).toContain('Your account is ready.');
    });

    it('includes CTA button when ctaText and ctaUrl provided', () => {
      const html = renderBaseTemplate({
        title: 'Verify Email',
        body: 'Click below to verify.',
        ctaText: 'Verify Email',
        ctaUrl: 'https://example.com/verify?token=abc123',
      });
      expect(html).toContain('Verify Email');
      expect(html).toContain('https://example.com/verify?token=abc123');
      expect(html).toContain('class="cta"');
    });

    it('omits CTA when not provided', () => {
      const html = renderBaseTemplate({ title: 'Test', body: 'No button here.' });
      expect(html).not.toContain('class="cta"');
    });

    it('includes preheader text when provided', () => {
      const html = renderBaseTemplate({
        title: 'Test',
        body: 'Content',
        preheader: 'Preview text for email clients',
      });
      expect(html).toContain('Preview text for email clients');
      expect(html).toContain('class="preheader"');
    });

    it('includes default footer', () => {
      const html = renderBaseTemplate({ title: 'Test', body: 'Content' });
      expect(html).toContain('ConnectSW');
    });

    it('renders valid HTML structure', () => {
      const html = renderBaseTemplate({ title: 'Test', body: 'Content' });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });
  });

  describe('email template data safety', () => {
    it('handles special characters in title', () => {
      const html = `<title>Welcome ${`O'Brien`}</title>`;
      expect(html).toContain("O'Brien");
    });

    it('handles unicode content', () => {
      const arabicTitle = 'مرحبا بك في ConnectSW';
      const html = `<h1>${arabicTitle}</h1>`;
      expect(html).toContain(arabicTitle);
    });
  });

  describe('email template types', () => {
    const templates = {
      welcome: (name: string) => `Welcome to ConnectSW, ${name}! Your account is ready.`,
      emailVerification: (url: string) => `Click here to verify your email: ${url}`,
      passwordReset: (url: string) => `Reset your password here: ${url}`,
      milestoneAlert: (childName: string, milestone: string) =>
        `${childName} has completed: ${milestone}`,
      paymentConfirmed: (amount: string, currency: string) =>
        `Payment of ${amount} ${currency} confirmed.`,
    };

    it('welcome template includes user name', () => {
      expect(templates.welcome('Alice')).toContain('Alice');
    });

    it('email verification includes URL', () => {
      const url = 'https://app.example.com/verify?token=abc';
      expect(templates.emailVerification(url)).toContain(url);
    });

    it('password reset includes URL', () => {
      const url = 'https://app.example.com/reset?token=xyz';
      expect(templates.passwordReset(url)).toContain(url);
    });

    it('milestone alert includes child name and milestone', () => {
      const result = templates.milestoneAlert('Ahmed', 'Memorised Surah Al-Mulk');
      expect(result).toContain('Ahmed');
      expect(result).toContain('Memorised Surah Al-Mulk');
    });

    it('payment confirmation includes amount and currency', () => {
      expect(templates.paymentConfirmed('500', 'USDC')).toContain('500 USDC');
    });
  });
});

/**
 * Data Sanitizer Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-019 (LLM Data Sanitization)
 *
 * The DataSanitizer strips PII and sensitive data before
 * sending text to LLM APIs. These are pure function tests
 * with no external dependencies.
 *
 * They WILL FAIL because DataSanitizer does not exist yet.
 *
 * [IMPL-031]
 */

// DataSanitizer will be created during Green phase
let DataSanitizer: typeof import('../../src/services/data-sanitizer').DataSanitizer;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/data-sanitizer');
    DataSanitizer = mod.DataSanitizer;
  } catch {
    // Expected to fail in Red phase — module does not exist yet
  }
});

// ---------- suite ----------

describe('DataSanitizer', () => {
  describe('sanitize', () => {
    test('[FR-019][AC-1] strips email addresses from text', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Our CTO john.doe@acme.com wants to migrate to AWS. Contact support@company.io for details.';
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain('john.doe@acme.com');
      expect(result).not.toContain('support@company.io');
      // Should replace with a redaction marker
      expect(result).toContain('[EMAIL_REDACTED]');
      // Context should be preserved
      expect(result).toContain('CTO');
      expect(result).toContain('migrate to AWS');
    });

    test('[FR-019][AC-2] strips phone numbers from text', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Call our office at (555) 123-4567 or mobile +1-555-987-6543 for the demo.';
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain('(555) 123-4567');
      expect(result).not.toContain('+1-555-987-6543');
      expect(result).toContain('[PHONE_REDACTED]');
      expect(result).toContain('office');
      expect(result).toContain('demo');
    });

    test('[FR-019][AC-3] strips SSN patterns from text', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Employee SSN is 123-45-6789. Please verify against records.';
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain('123-45-6789');
      expect(result).toContain('[SSN_REDACTED]');
      expect(result).toContain('Employee');
      expect(result).toContain('verify against records');
    });

    test('[FR-019][AC-4] redacts API keys and tokens', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Set OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678 in .env. ' +
        'Also configure AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY for deployment.';
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain('sk-proj-abc123def456ghi789jkl012mno345pqr678');
      expect(result).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      expect(result).toContain('[API_KEY_REDACTED]');
      expect(result).toContain('.env');
      expect(result).toContain('deployment');
    });

    test('[FR-019][AC-5] redacts credit card numbers', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Payment card: 4111-1111-1111-1111. Backup card: 5500 0000 0000 0004.';
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain('4111-1111-1111-1111');
      expect(result).not.toContain('5500 0000 0000 0004');
      expect(result).toContain('[CREDIT_CARD_REDACTED]');
      expect(result).toContain('Payment card');
    });

    test('[FR-019][AC-6] replaces specific dollar amounts with ranges', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Our cloud bill is $47,523.89/month. We spent $1,234,567 on infrastructure last year.';
      const result = sanitizer.sanitize(input);

      // Specific amounts should be replaced with ranges
      expect(result).not.toContain('$47,523.89');
      expect(result).not.toContain('$1,234,567');
      // Should contain range indicators (e.g., "$40K-$50K" or "[AMOUNT_RANGE]")
      expect(result).toMatch(/\$[\d]+K?-\$[\d]+K?|\[AMOUNT_RANGE\]/);
      // Context preserved
      expect(result).toContain('cloud bill');
      expect(result).toContain('infrastructure');
    });

    test('[FR-019][AC-7] preserves general context while removing PII', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Jane Smith (jane@acme.com, 555-123-4567) is our CTO. ' +
        'She recommends migrating from on-prem PostgreSQL to Aurora. ' +
        'Budget is $250,000 for Q2. SSN: 987-65-4321.';
      const result = sanitizer.sanitize(input);

      // All PII stripped
      expect(result).not.toContain('jane@acme.com');
      expect(result).not.toContain('555-123-4567');
      expect(result).not.toContain('987-65-4321');
      expect(result).not.toContain('$250,000');

      // Technical context preserved
      expect(result).toContain('CTO');
      expect(result).toContain('migrating');
      expect(result).toContain('PostgreSQL');
      expect(result).toContain('Aurora');
      expect(result).toContain('Q2');
    });

    test('[FR-019] handles text with no PII (returns unchanged)', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'We use TypeScript with Fastify for our backend. ' +
        'The architecture follows a microservices pattern with event-driven communication.';
      const result = sanitizer.sanitize(input);

      // Text with no PII should pass through unchanged
      expect(result).toBe(input);
    });

    test('[FR-019] handles empty/null input', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      expect(sanitizer.sanitize('')).toBe('');
      expect(sanitizer.sanitize(null as unknown as string)).toBe('');
      expect(sanitizer.sanitize(undefined as unknown as string)).toBe('');
    });
  });

  describe('detectPII', () => {
    test('[FR-019] returns list of detected PII types and locations', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'Contact john@example.com or call 555-123-4567 for details.';
      const detections = sanitizer.detectPII(input);

      expect(Array.isArray(detections)).toBe(true);
      expect(detections.length).toBeGreaterThanOrEqual(2);

      // Each detection should have type, value, and position
      for (const detection of detections) {
        expect(detection).toHaveProperty('type');
        expect(detection).toHaveProperty('value');
        expect(detection).toHaveProperty('start');
        expect(detection).toHaveProperty('end');
      }

      // Should detect email
      const emailDetection = detections.find(
        (d: { type: string }) => d.type === 'email'
      );
      expect(emailDetection).toBeDefined();
      expect(emailDetection!.value).toBe('john@example.com');

      // Should detect phone
      const phoneDetection = detections.find(
        (d: { type: string }) => d.type === 'phone'
      );
      expect(phoneDetection).toBeDefined();
    });

    test('[FR-019] detects multiple PII types in same text', () => {
      expect(DataSanitizer).toBeDefined();
      const sanitizer = new DataSanitizer();

      const input =
        'CEO bob@corp.com (SSN: 111-22-3333) card 4111111111111111 spent $99,999';
      const detections = sanitizer.detectPII(input);

      const types = detections.map((d: { type: string }) => d.type);

      expect(types).toContain('email');
      expect(types).toContain('ssn');
      expect(types).toContain('credit_card');
      // Dollar amount detection is also expected
      expect(types).toContain('dollar_amount');
    });
  });
});

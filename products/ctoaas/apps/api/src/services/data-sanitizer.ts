/**
 * Data Sanitizer Service
 *
 * Strips PII and sensitive data from text before sending to LLM APIs.
 * Implements FR-019 (LLM Data Sanitization).
 *
 * Detected PII types:
 *   - Email addresses
 *   - Phone numbers (US formats)
 *   - Social Security Numbers (XXX-XX-XXXX)
 *   - API keys / tokens (sk-*, pk_*, long alphanumeric, AWS-style)
 *   - Credit card numbers (16 digits, with spaces/dashes)
 *   - Dollar amounts ($X,XXX.XX)
 *
 * [IMPL-035][US-09][FR-019]
 */

export interface PiiDetection {
  type: string;
  value: string;
  start: number;
  end: number;
}

interface PiiPattern {
  type: string;
  regex: RegExp;
  replacement: string;
}

// Order matters: more specific patterns must come before general ones.
// SSN must precede phone so "123-45-6789" is caught as SSN, not phone.
// API key patterns must precede generic token patterns.
const PII_PATTERNS: PiiPattern[] = [
  {
    type: 'api_key',
    regex: /(?:sk-[A-Za-z0-9_-]{20,}|pk_[A-Za-z0-9_-]{20,})/g,
    replacement: '[API_KEY_REDACTED]',
  },
  {
    type: 'api_key',
    regex: /(?<==)[A-Za-z0-9/+]{30,}/g,
    replacement: '[API_KEY_REDACTED]',
  },
  {
    type: 'email',
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    type: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    type: 'credit_card',
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[CREDIT_CARD_REDACTED]',
  },
  {
    type: 'phone',
    regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    type: 'dollar_amount',
    regex: /\$[\d,]+(?:\.\d{1,2})?/g,
    replacement: '[AMOUNT_RANGE]',
  },
];

export class DataSanitizer {
  /**
   * Remove all PII from the input text, replacing each match with a
   * redaction marker.  Returns empty string for falsy input.
   */
  sanitize(text: string): string {
    if (!text) return '';

    let result = text;
    for (const pattern of PII_PATTERNS) {
      // Create a fresh regex each time to reset lastIndex
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      result = result.replace(regex, pattern.replacement);
    }
    return result;
  }

  /**
   * Detect all PII occurrences in the text without modifying it.
   * Returns an array of detections with type, matched value, and
   * character positions.
   */
  detectPII(text: string): PiiDetection[] {
    if (!text) return [];

    const detections: PiiDetection[] = [];

    for (const pattern of PII_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        detections.push({
          type: pattern.type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    // Sort by position for deterministic output
    detections.sort((a, b) => a.start - b.start);
    return detections;
  }
}

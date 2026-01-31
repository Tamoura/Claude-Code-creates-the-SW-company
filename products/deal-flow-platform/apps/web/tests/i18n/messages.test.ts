import en from '@/messages/en.json';
import ar from '@/messages/ar.json';

describe('i18n Messages', () => {
  describe('structure parity', () => {
    it('English and Arabic have the same top-level keys', () => {
      const enKeys = Object.keys(en).sort();
      const arKeys = Object.keys(ar).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('common namespace has matching keys', () => {
      const enKeys = Object.keys(en.common).sort();
      const arKeys = Object.keys(ar.common).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('auth namespace has matching keys', () => {
      const enKeys = Object.keys(en.auth).sort();
      const arKeys = Object.keys(ar.auth).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('deals namespace has matching keys', () => {
      const enKeys = Object.keys(en.deals).sort();
      const arKeys = Object.keys(ar.deals).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('deals.dealTypes has matching keys', () => {
      const enKeys = Object.keys(en.deals.dealTypes).sort();
      const arKeys = Object.keys(ar.deals.dealTypes).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('deals.statuses has matching keys', () => {
      const enKeys = Object.keys(en.deals.statuses).sort();
      const arKeys = Object.keys(ar.deals.statuses).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('investor namespace has matching keys', () => {
      const enKeys = Object.keys(en.investor).sort();
      const arKeys = Object.keys(ar.investor).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('issuer namespace has matching keys', () => {
      const enKeys = Object.keys(en.issuer).sort();
      const arKeys = Object.keys(ar.issuer).sort();
      expect(enKeys).toEqual(arKeys);
    });

    it('errors namespace has matching keys', () => {
      const enKeys = Object.keys(en.errors).sort();
      const arKeys = Object.keys(ar.errors).sort();
      expect(enKeys).toEqual(arKeys);
    });
  });

  describe('content validation', () => {
    it('English values are non-empty strings', () => {
      function checkValues(obj: Record<string, unknown>, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            checkValues(value as Record<string, unknown>, `${path}.${key}`);
          } else {
            expect(typeof value).toBe('string');
            expect((value as string).length).toBeGreaterThan(0);
          }
        }
      }
      checkValues(en);
    });

    it('Arabic values are non-empty strings', () => {
      function checkValues(obj: Record<string, unknown>, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            checkValues(value as Record<string, unknown>, `${path}.${key}`);
          } else {
            expect(typeof value).toBe('string');
            expect((value as string).length).toBeGreaterThan(0);
          }
        }
      }
      checkValues(ar);
    });

    it('Arabic translations contain Arabic characters', () => {
      // Check that Arabic translations actually contain Arabic script
      const arabicRegex = /[\u0600-\u06FF]/;
      expect(arabicRegex.test(ar.common.home)).toBe(true);
      expect(arabicRegex.test(ar.auth.login)).toBe(true);
      expect(arabicRegex.test(ar.deals.title)).toBe(true);
      expect(arabicRegex.test(ar.investor.portfolio)).toBe(true);
      expect(arabicRegex.test(ar.issuer.dashboard)).toBe(true);
    });

    it('deal types cover all DealType enum values', () => {
      const dealTypeKeys = Object.keys(en.deals.dealTypes);
      expect(dealTypeKeys).toContain('IPO');
      expect(dealTypeKeys).toContain('MUTUAL_FUND');
      expect(dealTypeKeys).toContain('SUKUK');
      expect(dealTypeKeys).toContain('PE_VC');
      expect(dealTypeKeys).toContain('PRIVATE_PLACEMENT');
      expect(dealTypeKeys).toContain('REAL_ESTATE');
      expect(dealTypeKeys).toContain('SAVINGS');
    });

    it('deal statuses cover all DealStatus enum values', () => {
      const statusKeys = Object.keys(en.deals.statuses);
      expect(statusKeys).toContain('DRAFT');
      expect(statusKeys).toContain('UNDER_REVIEW');
      expect(statusKeys).toContain('ACTIVE');
      expect(statusKeys).toContain('SUBSCRIPTION_OPEN');
      expect(statusKeys).toContain('SUBSCRIPTION_CLOSED');
      expect(statusKeys).toContain('ALLOCATION');
      expect(statusKeys).toContain('SETTLED');
      expect(statusKeys).toContain('CANCELLED');
    });
  });
});

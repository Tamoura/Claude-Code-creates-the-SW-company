/**
 * Tier Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-028 (Free Tier Message Limits)
 *
 * Tests define expected behavior for TierService.
 * Pure logic tests — no database required.
 *
 * [IMPL-083]
 */

let TierService: typeof import('../../src/services/tier.service').TierService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/tier.service');
    TierService = mod.TierService;
  } catch {
    // Expected to fail in Red phase — service does not exist yet
  }
});

// ---------- Helpers ----------

function freeUser(overrides: Partial<{
  dailyMessageCount: number;
  dailyMessageResetDate: Date | null;
}> = {}) {
  return {
    id: 'user-free-1',
    tier: 'FREE' as const,
    dailyMessageCount: overrides.dailyMessageCount ?? 0,
    dailyMessageResetDate: 'dailyMessageResetDate' in overrides
      ? overrides.dailyMessageResetDate!
      : new Date(),
  };
}

function proUser(overrides: Partial<{
  dailyMessageCount: number;
  dailyMessageResetDate: Date | null;
}> = {}) {
  return {
    id: 'user-pro-1',
    tier: 'PRO' as const,
    dailyMessageCount: overrides.dailyMessageCount ?? 0,
    dailyMessageResetDate: overrides.dailyMessageResetDate ?? new Date(),
  };
}

function enterpriseUser() {
  return {
    id: 'user-ent-1',
    tier: 'ENTERPRISE' as const,
    dailyMessageCount: 500,
    dailyMessageResetDate: new Date(),
  };
}

/** Return a Date for yesterday */
function yesterday(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** Return today's date (midnight UTC) */
function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ---------- Suite ----------

describe('TierService', () => {
  describe('checkMessageAllowance', () => {
    test('[FR-028][AC-1] allows messages when under daily limit', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({ dailyMessageCount: 5 });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(15); // 20 - 5
      expect(result.limit).toBe(20);
      expect(result.tier).toBe('FREE');
    });

    test('[FR-028][AC-2] blocks messages when daily limit reached (20 for free)', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({ dailyMessageCount: 20 });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.tier).toBe('FREE');
    });

    test('[FR-028][AC-3] resets counter at midnight UTC', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      // User hit limit yesterday — should be reset today
      const user = freeUser({
        dailyMessageCount: 20,
        dailyMessageResetDate: yesterday(),
      });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20); // counter was reset
      expect(result.needsReset).toBe(true);
    });

    test('[FR-028][AC-4] pro tier has unlimited messages', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = proUser({ dailyMessageCount: 1000 });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull(); // unlimited
      expect(result.limit).toBeNull();
      expect(result.tier).toBe('PRO');
    });

    test('[FR-028][AC-4] enterprise tier has unlimited messages', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = enterpriseUser();
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
      expect(result.limit).toBeNull();
      expect(result.tier).toBe('ENTERPRISE');
    });

    test('[FR-028][AC-5] returns remaining message count', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({ dailyMessageCount: 13 });
      const result = service.checkMessageAllowance(user);

      expect(result.remaining).toBe(7); // 20 - 13
      expect(result.tier).toBe('FREE');
      expect(result.limit).toBe(20);
    });

    test('[FR-028] returns upgrade CTA when blocked', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({ dailyMessageCount: 20 });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(false);
      expect(result.upgradeCta).toBeDefined();
      expect(typeof result.upgradeCta).toBe('string');
      expect(result.upgradeCta!.length).toBeGreaterThan(0);
    });

    test('[FR-028] does not return upgrade CTA when allowed', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({ dailyMessageCount: 5 });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(true);
      expect(result.upgradeCta).toBeUndefined();
    });

    test('[FR-028] handles null dailyMessageResetDate (first-time user)', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({
        dailyMessageCount: 0,
        dailyMessageResetDate: null,
      });
      const result = service.checkMessageAllowance(user);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20);
      expect(result.needsReset).toBe(true);
    });

    test('[FR-028] blocks at exactly 20 messages (boundary)', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      // 19 messages: allowed
      const user19 = freeUser({ dailyMessageCount: 19 });
      const result19 = service.checkMessageAllowance(user19);
      expect(result19.allowed).toBe(true);
      expect(result19.remaining).toBe(1);

      // 20 messages: blocked
      const user20 = freeUser({ dailyMessageCount: 20 });
      const result20 = service.checkMessageAllowance(user20);
      expect(result20.allowed).toBe(false);
      expect(result20.remaining).toBe(0);

      // 21 messages (somehow exceeded): still blocked
      const user21 = freeUser({ dailyMessageCount: 21 });
      const result21 = service.checkMessageAllowance(user21);
      expect(result21.allowed).toBe(false);
      expect(result21.remaining).toBe(0);
    });
  });

  describe('getTierStatus', () => {
    test('[FR-028] returns complete tier status for free user', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = freeUser({ dailyMessageCount: 10 });
      const status = service.getTierStatus(user);

      expect(status.tier).toBe('FREE');
      expect(status.messagesUsed).toBe(10);
      expect(status.messagesLimit).toBe(20);
      expect(status.messagesRemaining).toBe(10);
      expect(status.isUnlimited).toBe(false);
    });

    test('[FR-028] returns complete tier status for pro user', () => {
      expect(TierService).toBeDefined();
      const service = new TierService();

      const user = proUser({ dailyMessageCount: 50 });
      const status = service.getTierStatus(user);

      expect(status.tier).toBe('PRO');
      expect(status.messagesUsed).toBe(50);
      expect(status.messagesLimit).toBeNull();
      expect(status.messagesRemaining).toBeNull();
      expect(status.isUnlimited).toBe(true);
    });
  });
});

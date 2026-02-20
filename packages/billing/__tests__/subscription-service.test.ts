import { SubscriptionService, Plan } from '../src/backend/services/subscription.service';

const TEST_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    priceMonthly: 0,
    priceAnnual: 0,
    features: {
      api_calls: 100,
      ai_insights: false,
      webhooks: false,
      team_members: 1,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    priceMonthly: 49,
    priceAnnual: 490,
    features: {
      api_calls: 10000,
      ai_insights: true,
      webhooks: true,
      team_members: 5,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    priceMonthly: 500,
    priceAnnual: 5000,
    features: {
      api_calls: -1, // unlimited
      ai_insights: true,
      webhooks: true,
      team_members: -1, // unlimited
    },
  },
];

function createMockPrisma(initialSubscription: any = null) {
  let subscription = initialSubscription;
  return {
    subscription: {
      findUnique: jest.fn(async () => subscription),
      create: jest.fn(async ({ data }: { data: any }) => {
        subscription = { id: 'sub-1', ...data };
        return subscription;
      }),
      update: jest.fn(async ({ data }: { data: any }) => {
        subscription = { ...subscription, ...data };
        return subscription;
      }),
    },
  };
}

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new SubscriptionService(mockPrisma, { plans: TEST_PLANS, defaultTier: 'free' });
  });

  describe('getPlans', () => {
    it('returns all configured plans', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(3);
    });

    it('returns plans with correct IDs', () => {
      const plans = service.getPlans();
      const ids = plans.map(p => p.id);
      expect(ids).toContain('free');
      expect(ids).toContain('pro');
      expect(ids).toContain('enterprise');
    });
  });

  describe('getPlan', () => {
    it('returns a plan by ID', () => {
      const plan = service.getPlan('pro');
      expect(plan).toBeDefined();
      expect(plan?.name).toBe('Pro');
    });

    it('returns undefined for unknown plan', () => {
      expect(service.getPlan('nonexistent')).toBeUndefined();
    });
  });

  describe('getSubscription', () => {
    it('auto-creates free subscription for new users', async () => {
      const sub = await service.getSubscription('user-new');
      expect(sub).toBeDefined();
      expect(sub.tier).toBe('free');
      expect(mockPrisma.subscription.create).toHaveBeenCalledTimes(1);
    });

    it('returns existing subscription', async () => {
      mockPrisma = createMockPrisma({ id: 'sub-existing', userId: 'user-1', tier: 'pro', status: 'ACTIVE' });
      service = new SubscriptionService(mockPrisma, { plans: TEST_PLANS });

      const sub = await service.getSubscription('user-1');
      expect(sub.tier).toBe('pro');
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });
  });

  describe('hasFeature', () => {
    it('returns true for feature enabled on free plan', async () => {
      // user on free plan, api_calls is 100 (truthy number)
      mockPrisma = createMockPrisma({ userId: 'user-1', planId: 'free', tier: 'free', status: 'ACTIVE' });
      service = new SubscriptionService(mockPrisma, { plans: TEST_PLANS });

      const hasApiCalls = await service.hasFeature('user-1', 'api_calls');
      expect(hasApiCalls).toBe(true);
    });

    it('returns false for feature disabled on free plan', async () => {
      mockPrisma = createMockPrisma({ userId: 'user-1', planId: 'free', tier: 'free', status: 'ACTIVE' });
      service = new SubscriptionService(mockPrisma, { plans: TEST_PLANS });

      const hasAiInsights = await service.hasFeature('user-1', 'ai_insights');
      expect(hasAiInsights).toBe(false);
    });

    it('returns true for feature enabled on pro plan', async () => {
      mockPrisma = createMockPrisma({ userId: 'user-pro', planId: 'pro', tier: 'pro', status: 'ACTIVE' });
      service = new SubscriptionService(mockPrisma, { plans: TEST_PLANS });

      const hasAiInsights = await service.hasFeature('user-pro', 'ai_insights');
      expect(hasAiInsights).toBe(true);
    });
  });
});

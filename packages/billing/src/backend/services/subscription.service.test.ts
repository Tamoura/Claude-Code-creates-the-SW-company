import { SubscriptionService, Plan } from './subscription.service';

const TEST_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'FREE',
    priceMonthly: 0,
    priceAnnual: 0,
    features: { projects: 3, api_calls: 1000, advanced_analytics: false },
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'PRO',
    priceMonthly: 29,
    priceAnnual: 290,
    features: { projects: 50, api_calls: 100000, advanced_analytics: true },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    priceMonthly: 99,
    priceAnnual: 990,
    features: { projects: true, api_calls: true, advanced_analytics: true, sso: true },
  },
];

function createMockPrisma() {
  return {
    subscription: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new SubscriptionService(mockPrisma, { plans: TEST_PLANS });
  });

  describe('getPlans()', () => {
    it('returns all configured plans', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.id)).toEqual(['free', 'pro', 'enterprise']);
    });
  });

  describe('getPlan()', () => {
    it('returns plan by ID', () => {
      const plan = service.getPlan('pro');
      expect(plan).toBeDefined();
      expect(plan!.name).toBe('Pro');
      expect(plan!.tier).toBe('PRO');
    });

    it('returns undefined for unknown plan ID', () => {
      const plan = service.getPlan('nonexistent');
      expect(plan).toBeUndefined();
    });
  });

  describe('getSubscription()', () => {
    it('auto-creates free tier for new user', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const createdSub = {
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'ACTIVE',
      };
      mockPrisma.subscription.create.mockResolvedValue(createdSub);

      const result = await service.getSubscription('user-1');

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          planId: 'free',
          tier: 'FREE',
          status: 'ACTIVE',
        },
      });
      expect(result).toEqual(createdSub);
    });

    it('returns existing subscription', async () => {
      const existingSub = {
        userId: 'user-2',
        planId: 'pro',
        tier: 'PRO',
        status: 'ACTIVE',
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(existingSub);

      const result = await service.getSubscription('user-2');

      expect(result).toEqual(existingSub);
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });
  });

  describe('hasFeature()', () => {
    it('returns true for boolean feature set to true', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planId: 'pro',
        tier: 'PRO',
        status: 'ACTIVE',
      });

      const result = await service.hasFeature('user-1', 'advanced_analytics');
      expect(result).toBe(true);
    });

    it('returns false for missing feature', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'ACTIVE',
      });

      const result = await service.hasFeature('user-1', 'sso');
      expect(result).toBe(false);
    });

    it('returns true for numeric feature > 0', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'ACTIVE',
      });

      const result = await service.hasFeature('user-1', 'projects');
      expect(result).toBe(true);
    });
  });

  describe('getFeatureLimit()', () => {
    it('returns number for numeric features', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'ACTIVE',
      });

      const result = await service.getFeatureLimit('user-1', 'projects');
      expect(result).toBe(3);
    });

    it('returns Infinity for boolean true features', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planId: 'enterprise',
        tier: 'ENTERPRISE',
        status: 'ACTIVE',
      });

      const result = await service.getFeatureLimit('user-1', 'projects');
      expect(result).toBe(Infinity);
    });

    it('returns 0 for missing features', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'ACTIVE',
      });

      const result = await service.getFeatureLimit('user-1', 'sso');
      expect(result).toBe(0);
    });
  });

  describe('changePlan()', () => {
    it('updates subscription tier', async () => {
      const existingSub = {
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'ACTIVE',
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(existingSub);

      const updatedSub = {
        userId: 'user-1',
        planId: 'pro',
        tier: 'PRO',
        status: 'ACTIVE',
        previousPlanId: 'free',
      };
      mockPrisma.subscription.update.mockResolvedValue(updatedSub);

      const result = await service.changePlan('user-1', 'pro');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          planId: 'pro',
          tier: 'PRO',
          previousPlanId: 'free',
        }),
      });
      expect(result).toEqual(updatedSub);
    });

    it('throws for unknown plan ID', async () => {
      await expect(service.changePlan('user-1', 'nonexistent')).rejects.toThrow(
        'Plan not found: nonexistent'
      );
    });
  });

  describe('cancel()', () => {
    it('reverts to free plan and sets CANCELLED status', async () => {
      const existingSub = {
        userId: 'user-1',
        planId: 'pro',
        tier: 'PRO',
        status: 'ACTIVE',
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(existingSub);

      const cancelledSub = {
        userId: 'user-1',
        planId: 'free',
        tier: 'FREE',
        status: 'CANCELLED',
        previousPlanId: 'pro',
      };
      mockPrisma.subscription.update.mockResolvedValue(cancelledSub);

      const result = await service.cancel('user-1');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          planId: 'free',
          tier: 'FREE',
          status: 'CANCELLED',
          previousPlanId: 'pro',
        }),
      });
      expect(result).toEqual(cancelledSub);
    });
  });
});

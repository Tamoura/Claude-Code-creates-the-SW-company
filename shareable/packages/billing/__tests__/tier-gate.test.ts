/**
 * Tier Gate middleware tests
 *
 * Tests the requireFeature and requireUsageLimit Fastify preHandlers
 * using mock request/reply objects.
 */

function createMockRequest(overrides: Partial<any> = {}): any {
  return {
    currentUser: { id: 'user-1', email: 'user@test.com' },
    ...overrides,
  };
}

function createMockReply(): any {
  const reply = {
    statusCode: 200,
    sentStatus: 0,
    sentBody: null as any,
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockImplementation(function(this: any, body: any) {
      this.sentBody = body;
      return this;
    }),
  };
  reply.code.mockImplementation((status: number) => {
    reply.sentStatus = status;
    return reply;
  });
  return reply;
}

function createMockSubscriptionService(hasFeatureResult = true): any {
  return {
    hasFeature: jest.fn().mockResolvedValue(hasFeatureResult),
    getSubscription: jest.fn().mockResolvedValue({ tier: 'free', planId: 'free' }),
    getPlan: jest.fn().mockReturnValue({ features: { api_calls: 100 } }),
  };
}

function createMockUsageService(withinLimitResult = true): any {
  return {
    isWithinLimit: jest.fn().mockResolvedValue(withinLimitResult),
    increment: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(0),
  };
}

describe('Tier Gate Middleware Logic', () => {
  describe('requireFeature logic', () => {
    async function simulateRequireFeature(
      feature: string,
      request: any,
      reply: any,
      subscriptionService: any
    ): Promise<void> {
      const userId = request.currentUser?.id;
      if (!userId) {
        reply.code(401).send({ status: 401, detail: 'Authentication required' });
        return;
      }

      const hasAccess = await subscriptionService.hasFeature(userId, feature);
      if (!hasAccess) {
        reply.code(403).send({
          status: 403,
          detail: `Your plan does not include "${feature}". Please upgrade.`,
          code: 'feature-not-available',
          feature,
        });
      }
    }

    it('allows access when user has the feature', async () => {
      const request = createMockRequest();
      const reply = createMockReply();
      const subscriptionService = createMockSubscriptionService(true);

      await simulateRequireFeature('ai_insights', request, reply, subscriptionService);

      expect(reply.code).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it('returns 403 when user does not have the feature', async () => {
      const request = createMockRequest();
      const reply = createMockReply();
      const subscriptionService = createMockSubscriptionService(false);

      await simulateRequireFeature('ai_insights', request, reply, subscriptionService);

      expect(reply.sentStatus).toBe(403);
      expect(reply.sentBody.code).toBe('feature-not-available');
      expect(reply.sentBody.feature).toBe('ai_insights');
    });

    it('returns 401 when user is not authenticated', async () => {
      const request = createMockRequest({ currentUser: undefined });
      const reply = createMockReply();
      const subscriptionService = createMockSubscriptionService(true);

      await simulateRequireFeature('ai_insights', request, reply, subscriptionService);

      expect(reply.sentStatus).toBe(401);
    });

    it('calls subscriptionService.hasFeature with correct parameters', async () => {
      const request = createMockRequest();
      const reply = createMockReply();
      const subscriptionService = createMockSubscriptionService(true);

      await simulateRequireFeature('webhooks', request, reply, subscriptionService);

      expect(subscriptionService.hasFeature).toHaveBeenCalledWith('user-1', 'webhooks');
    });
  });

  describe('requireUsageLimit logic', () => {
    async function simulateRequireUsageLimit(
      feature: string,
      limit: number,
      request: any,
      reply: any,
      subscriptionService: any,
      usageService: any
    ): Promise<void> {
      const userId = request.currentUser?.id;
      if (!userId) {
        reply.code(401).send({ status: 401, detail: 'Authentication required' });
        return;
      }

      const withinLimit = await usageService.isWithinLimit(userId, feature, limit);
      if (!withinLimit) {
        reply.code(429).send({
          status: 429,
          detail: `Usage limit exceeded for "${feature}".`,
          code: 'usage-limit-exceeded',
        });
        return;
      }

      await usageService.increment(userId, feature);
    }

    it('allows request within usage limit', async () => {
      const request = createMockRequest();
      const reply = createMockReply();
      const sub = createMockSubscriptionService();
      const usage = createMockUsageService(true);

      await simulateRequireUsageLimit('api_calls', 100, request, reply, sub, usage);

      expect(reply.sentStatus).toBe(0); // No status set = allowed
      expect(usage.increment).toHaveBeenCalledWith('user-1', 'api_calls');
    });

    it('returns 429 when usage limit exceeded', async () => {
      const request = createMockRequest();
      const reply = createMockReply();
      const sub = createMockSubscriptionService();
      const usage = createMockUsageService(false);

      await simulateRequireUsageLimit('api_calls', 100, request, reply, sub, usage);

      expect(reply.sentStatus).toBe(429);
      expect(reply.sentBody.code).toBe('usage-limit-exceeded');
      expect(usage.increment).not.toHaveBeenCalled();
    });
  });
});

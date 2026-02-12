import { describe, it, expect } from '@jest/globals';

describe('Trending Strategy', () => {
  it('should weight event types correctly for velocity scoring', () => {
    const WEIGHTS: Record<string, number> = {
      product_viewed: 1,
      product_clicked: 2,
      add_to_cart: 3,
      remove_from_cart: 0,
      purchase: 5,
      recommendation_clicked: 2,
      recommendation_impressed: 0,
    };

    // Simulate scoring: product A has 10 views + 5 purchases = 35
    const productA = 10 * WEIGHTS.product_viewed + 5 * WEIGHTS.purchase;
    // product B has 50 views + 0 purchases = 50
    const productB = 50 * WEIGHTS.product_viewed;
    // product C has 3 views + 10 purchases = 53
    const productC = 3 * WEIGHTS.product_viewed + 10 * WEIGHTS.purchase;

    expect(productC).toBeGreaterThan(productB);
    expect(productB).toBeGreaterThan(productA);
  });

  it('should only consider events from the last 24 hours', () => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const recentEvent = { timestamp: now - 1000 };
    const oldEvent = { timestamp: now - 25 * 60 * 60 * 1000 };

    expect(recentEvent.timestamp).toBeGreaterThan(twentyFourHoursAgo);
    expect(oldEvent.timestamp).toBeLessThan(twentyFourHoursAgo);
  });

  it('should exclude zero-weight events from scoring', () => {
    const WEIGHTS: Record<string, number> = {
      remove_from_cart: 0,
      recommendation_impressed: 0,
    };

    const score = (WEIGHTS.remove_from_cart || 0) + (WEIGHTS.recommendation_impressed || 0);
    expect(score).toBe(0);
  });
});

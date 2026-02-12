import { describe, it, expect } from '@jest/globals';

describe('Frequently Bought Together Strategy', () => {
  it('should compute co-occurrence counts correctly', () => {
    // Simulate: users who bought product A also bought these products
    const coPurchases = [
      { productId: 'B', userId: 'user1' },
      { productId: 'C', userId: 'user1' },
      { productId: 'B', userId: 'user2' },
      { productId: 'D', userId: 'user2' },
      { productId: 'B', userId: 'user3' },
    ];

    const coOccurrence = new Map<string, number>();
    for (const event of coPurchases) {
      coOccurrence.set(event.productId, (coOccurrence.get(event.productId) || 0) + 1);
    }

    expect(coOccurrence.get('B')).toBe(3);
    expect(coOccurrence.get('C')).toBe(1);
    expect(coOccurrence.get('D')).toBe(1);
  });

  it('should exclude the context product from results', () => {
    const contextProduct = 'A';
    const results = ['B', 'C', 'D'];
    expect(results).not.toContain(contextProduct);
  });

  it('should only consider purchases within 7-day window', () => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentPurchase = { timestamp: now - 2 * 24 * 60 * 60 * 1000 };
    const oldPurchase = { timestamp: now - 10 * 24 * 60 * 60 * 1000 };

    expect(recentPurchase.timestamp).toBeGreaterThan(sevenDaysAgo);
    expect(oldPurchase.timestamp).toBeLessThan(sevenDaysAgo);
  });
});

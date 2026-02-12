import { describe, it, expect } from '@jest/globals';

describe('Content-Based Filtering Strategy', () => {
  it('should compute category frequency from user interactions', () => {
    const interactions = [
      { category: 'Shoes' },
      { category: 'Shoes' },
      { category: 'Shirts' },
      { category: 'Shoes' },
    ];

    const categoryFreq = new Map<string, number>();
    for (const item of interactions) {
      categoryFreq.set(item.category, (categoryFreq.get(item.category) || 0) + 1);
    }

    expect(categoryFreq.get('Shoes')).toBe(3);
    expect(categoryFreq.get('Shirts')).toBe(1);
  });

  it('should compute price range proximity score', () => {
    const priceRange = { min: 50, max: 150 };
    const midPrice = (priceRange.min + priceRange.max) / 2; // 100
    const range = priceRange.max - priceRange.min; // 100

    // Product at $95 - close to midpoint
    const closePrice = 95;
    const closeDistance = Math.abs(closePrice - midPrice) / range;
    const closeScore = Math.max(0, 1 - closeDistance);

    // Product at $300 - far from range
    const farPrice = 300;
    const farDistance = Math.abs(farPrice - midPrice) / range;
    const farScore = Math.max(0, 1 - farDistance);

    expect(closeScore).toBeGreaterThan(farScore);
    expect(closeScore).toBeGreaterThan(0.9);
  });

  it('should compute attribute overlap between products', () => {
    const candidate = { color: 'blue', size: '10', brand: 'Nike' };
    const userItem = { color: 'blue', size: '9', brand: 'Nike' };

    const sharedKeys = Object.keys(candidate).filter(
      k => k in userItem && JSON.stringify((candidate as any)[k]) === JSON.stringify((userItem as any)[k])
    );

    expect(sharedKeys).toContain('color');
    expect(sharedKeys).toContain('brand');
    expect(sharedKeys).not.toContain('size'); // different value
    expect(sharedKeys.length).toBe(2);
  });
});

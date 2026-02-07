import {
  DIMENSIONS,
  getDimensionBySlug,
  DIMENSION_SLUGS,
} from '../../src/lib/dimensions';

describe('dimensions', () => {
  it('has exactly 6 dimensions', () => {
    expect(DIMENSIONS).toHaveLength(6);
  });

  it('has all required dimension slugs', () => {
    expect(DIMENSION_SLUGS).toEqual([
      'academic',
      'social-emotional',
      'behavioural',
      'aspirational',
      'islamic',
      'physical',
    ]);
  });

  it('getDimensionBySlug returns correct dimension', () => {
    const academic = getDimensionBySlug('academic');
    expect(academic?.name).toBe('Academic');
    expect(academic?.colour).toBe('#3B82F6');
    expect(academic?.icon).toBe('Book');
  });

  it('getDimensionBySlug returns undefined for invalid slug', () => {
    expect(getDimensionBySlug('nonexistent')).toBeUndefined();
  });

  it('each dimension has all required fields', () => {
    for (const dim of DIMENSIONS) {
      expect(dim.name).toBeTruthy();
      expect(dim.slug).toBeTruthy();
      expect(dim.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(dim.bgClass).toBeTruthy();
      expect(dim.textClass).toBeTruthy();
      expect(dim.borderClass).toBeTruthy();
      expect(dim.bgLightClass).toBeTruthy();
      expect(dim.icon).toBeTruthy();
      expect(dim.description).toBeTruthy();
    }
  });

  it('dimensions have unique slugs', () => {
    const slugs = DIMENSIONS.map((d) => d.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it('dimensions have the correct colours', () => {
    const colourMap: Record<string, string> = {
      academic: '#3B82F6',
      'social-emotional': '#EC4899',
      behavioural: '#F59E0B',
      aspirational: '#8B5CF6',
      islamic: '#10B981',
      physical: '#EF4444',
    };

    for (const dim of DIMENSIONS) {
      expect(dim.colour).toBe(colourMap[dim.slug]);
    }
  });
});

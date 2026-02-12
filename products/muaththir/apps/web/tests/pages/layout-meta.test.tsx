/**
 * Tests for root layout metadata configuration.
 *
 * Since Next.js metadata is exported as a static object, we import and
 * validate it directly rather than rendering the full layout (which
 * requires async server components and next-intl server APIs).
 */

describe('Root layout metadata', () => {
  // Dynamic import so jest module mocks are not needed for next-intl/server
  let metadata: Record<string, unknown>;

  beforeAll(async () => {
    // We need to isolate the metadata export; mock only what the module
    // file-level imports require at parse time.
    jest.mock('next-intl/server', () => ({
      getLocale: jest.fn().mockResolvedValue('en'),
      getMessages: jest.fn().mockResolvedValue({}),
    }));
    const mod = await import('../../src/app/layout');
    metadata = (mod as any).metadata;
  });

  it('has a title', () => {
    expect(metadata.title).toBeDefined();
    expect(typeof metadata.title).toBe('string');
  });

  it('has a description', () => {
    expect(metadata.description).toBeDefined();
    expect(typeof metadata.description).toBe('string');
  });

  it('has keywords', () => {
    expect(metadata.keywords).toBeDefined();
    expect(Array.isArray(metadata.keywords)).toBe(true);
  });

  it('has themeColor', () => {
    expect(metadata.themeColor).toBeDefined();
  });

  it('has viewport configuration', () => {
    expect(metadata.viewport).toBeDefined();
  });

  it('has Open Graph metadata', () => {
    const og = (metadata as any).openGraph;
    expect(og).toBeDefined();
    expect(og.title).toBeDefined();
    expect(og.description).toBeDefined();
    expect(og.type).toBe('website');
  });

  it('has apple mobile web app meta', () => {
    const apple = (metadata as any).appleWebApp;
    expect(apple).toBeDefined();
    expect(apple.capable).toBe(true);
  });
});

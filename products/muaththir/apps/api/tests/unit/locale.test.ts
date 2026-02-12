import { getLocale } from '../../src/lib/locale';

describe('getLocale', () => {
  function fakeRequest(acceptLanguage?: string) {
    return {
      headers: acceptLanguage !== undefined
        ? { 'accept-language': acceptLanguage }
        : {},
    } as { headers: Record<string, string | undefined> };
  }

  it('returns "en" when no Accept-Language header', () => {
    expect(getLocale(fakeRequest())).toBe('en');
  });

  it('returns "ar" when Accept-Language is "ar"', () => {
    expect(getLocale(fakeRequest('ar'))).toBe('ar');
  });

  it('returns "ar" when Accept-Language is "ar-SA"', () => {
    expect(getLocale(fakeRequest('ar-SA'))).toBe('ar');
  });

  it('returns "en" for unsupported locale "fr"', () => {
    expect(getLocale(fakeRequest('fr'))).toBe('en');
  });

  it('returns "en" when Accept-Language is empty string', () => {
    expect(getLocale(fakeRequest(''))).toBe('en');
  });

  it('returns "ar" when Accept-Language is "ar-EG"', () => {
    expect(getLocale(fakeRequest('ar-EG'))).toBe('ar');
  });

  it('returns "en" when Accept-Language is "en-US"', () => {
    expect(getLocale(fakeRequest('en-US'))).toBe('en');
  });
});

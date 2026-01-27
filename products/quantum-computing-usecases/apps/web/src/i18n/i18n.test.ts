import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';

describe('i18n configuration', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });

  it('should initialize with English as default language', () => {
    expect(i18n.language).toBe('en');
  });

  it('should have English and Arabic languages available', () => {
    const languages = Object.keys(i18n.services.resourceStore.data);
    expect(languages).toContain('en');
    expect(languages).toContain('ar');
  });

  it('should switch to Arabic language', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.language).toBe('ar');
  });

  it('should translate common UI elements in English', () => {
    expect(i18n.t('common.browse')).toBe('Browse');
    expect(i18n.t('common.compare')).toBe('Compare');
    expect(i18n.t('common.learningPath')).toBe('Learning Path');
  });

  it('should translate common UI elements in Arabic', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.t('common.browse')).toBe('تصفح');
    expect(i18n.t('common.compare')).toBe('مقارنة');
    expect(i18n.t('common.learningPath')).toBe('مسار التعلم');
  });

  it('should return correct text direction for English', () => {
    expect(i18n.dir()).toBe('ltr');
  });

  it('should return correct text direction for Arabic', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.dir()).toBe('rtl');
  });
});

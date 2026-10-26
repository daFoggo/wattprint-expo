import en from './locales/en.json';
import vi from './locales/vi.json';

import { i18n, resolveLanguage } from './index';

describe('i18n', () => {
  it('resolves the first supported language, else en', () => {
    expect(resolveLanguage(['fr', 'vi'])).toBe('vi');
    expect(resolveLanguage([null, 'de'])).toBe('en');
  });

  it('translates vi and falls back to en for missing keys', () => {
    expect(i18n.t('settings.title', { lng: 'vi' })).toBe(vi.settings.title);
    i18n.addResource('en', 'translation', 'test.enOnly', 'only in en');
    expect(i18n.t('test.enOnly', { lng: 'vi' })).toBe('only in en');
    expect(i18n.t('settings.title', { lng: 'en' })).toBe(en.settings.title);
  });
});

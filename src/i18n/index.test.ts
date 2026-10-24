import en from './locales/en.json';
import vi from './locales/vi.json';

import { i18n, resolveLanguage } from './index';

describe('i18n', () => {
  it('resolves the first supported language, else en', () => {
    expect(resolveLanguage(['fr', 'vi'])).toBe('vi');
    expect(resolveLanguage([null, 'de'])).toBe('en');
  });

  it('translates vi and falls back to en for missing keys', () => {
    expect(i18n.t('home.title', { lng: 'vi' })).toBe(vi.home.title);
    expect(i18n.t('form.submitted', { lng: 'vi', email: 'a@b.co' })).toBe(
      i18n.t('form.submitted', { lng: 'en', email: 'a@b.co' }),
    );
    expect(i18n.t('home.title', { lng: 'en' })).toBe(en.home.title);
  });
});

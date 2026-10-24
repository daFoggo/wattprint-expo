import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveLanguage(codes: readonly (string | null)[]): SupportedLanguage {
  for (const code of codes) {
    const match = SUPPORTED_LANGUAGES.find((l) => l === code);
    if (match) return match;
  }
  return 'en';
}

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: resolveLanguage(getLocales().map((l) => l.languageCode)),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export { i18n };

import type { Theme } from 'expo-router';
import type { ColorValue } from 'react-native';

export type Scheme = 'light' | 'dark';
export type NavTokens = {
  background: string;
  foreground: string;
  primary: string;
  card: string;
  border: string;
};

export function resolveScheme(
  preference: 'system' | Scheme,
  system: Scheme | null | undefined,
): Scheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

// Theme variables hold space separated triples ("255 255 255"); navigation needs a CSS colour.
export function toCssColor(value: string): string {
  const parts = value.trim().split(/\s+/);
  const isTriple = parts.length === 3 && parts.every((p) => /^\d+(\.\d+)?$/.test(p));
  return isTriple ? `rgb(${parts.join(', ')})` : value;
}

// `bases` are expo-router's DefaultTheme/DarkTheme (fonts, dark flag); injected so this stays pure.
export function buildNavTheme(
  scheme: Scheme,
  tokens: Partial<NavTokens>,
  bases: Record<Scheme, Theme>,
): Theme {
  const base = bases[scheme];
  const pick = (value: string | undefined, fallback: ColorValue): ColorValue =>
    value === undefined ? fallback : toCssColor(value);
  return {
    ...base,
    colors: {
      ...base.colors,
      background: pick(tokens.background, base.colors.background),
      text: pick(tokens.foreground, base.colors.text),
      primary: pick(tokens.primary, base.colors.primary),
      card: pick(tokens.card, base.colors.card),
      border: pick(tokens.border, base.colors.border),
    },
  };
}

import type { Theme } from 'expo-router';

import { buildNavTheme, resolveScheme, toCssColor, type NavTokens } from './nav-theme';

const tokens: NavTokens = {
  background: '255 255 255',
  foreground: '10 10 10',
  primary: '23 23 23',
  card: 'rgb(255, 255, 255)',
  border: '#e5e5e5',
};

const fonts = {} as Theme['fonts'];
const bases: Record<'light' | 'dark', Theme> = {
  light: {
    dark: false,
    fonts,
    colors: { primary: 'p', background: 'b', card: 'c', text: 't', border: 'o', notification: 'n' },
  },
  dark: {
    dark: true,
    fonts,
    colors: { primary: 'p', background: 'b', card: 'c', text: 't', border: 'o', notification: 'n' },
  },
};

describe('resolveScheme', () => {
  it('follows the stored preference over the system scheme', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('uses the system scheme for "system", light when unknown', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});

describe('toCssColor', () => {
  it('converts a space separated rgb triple and passes other colours through', () => {
    expect(toCssColor('255 255 255')).toBe('rgb(255, 255, 255)');
    expect(toCssColor('#e5e5e5')).toBe('#e5e5e5');
    expect(toCssColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
  });
});

describe('buildNavTheme', () => {
  it('maps tokens onto the navigation colours and keeps the dark flag and fonts', () => {
    const theme = buildNavTheme('dark', tokens, bases);
    expect(theme.dark).toBe(true);
    expect(theme.colors.background).toBe('rgb(255, 255, 255)');
    expect(theme.colors.text).toBe('rgb(10, 10, 10)');
    expect(theme.colors.primary).toBe('rgb(23, 23, 23)');
    expect(theme.colors.card).toBe('rgb(255, 255, 255)');
    expect(theme.colors.border).toBe('#e5e5e5');
    expect(theme.fonts).toBe(fonts);
    expect(theme.colors.notification).toBe('n');
    expect(buildNavTheme('light', tokens, bases).dark).toBe(false);
  });

  it('keeps the base colour when a token is missing', () => {
    const theme = buildNavTheme('light', { background: '1 2 3' }, bases);
    expect(theme.colors.background).toBe('rgb(1, 2, 3)');
    expect(theme.colors.text).toBe('t');
  });
});

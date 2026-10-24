import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { buildNavTheme, resolveScheme } from '@/lib/nav-theme';
import { usePreferencesStore } from '@/stores/preferences-store';

const asString = (value: string | number | undefined) =>
  typeof value === 'string' ? value : undefined;

// Navigation theme from the stored preference (not only the system scheme) and the design tokens.
export function useNavTheme(): Theme {
  const system = useColorScheme();
  const preference = usePreferencesStore((s) => s.theme);
  const [background, foreground, primary, card, border] = useCSSVariable([
    '--background',
    '--foreground',
    '--primary',
    '--card',
    '--border',
  ]);
  return buildNavTheme(
    resolveScheme(preference, system),
    {
      background: asString(background),
      foreground: asString(foreground),
      primary: asString(primary),
      card: asString(card),
      border: asString(border),
    },
    { light: DefaultTheme, dark: DarkTheme },
  );
}

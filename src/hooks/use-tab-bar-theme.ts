import { useCSSVariable } from 'uniwind';

import { buildTabBarTheme } from '@/lib/tab-bar-theme';

const asString = (value: string | number | undefined) =>
  typeof value === 'string' ? value : undefined;

// Tab bar colours from the design tokens (the native tab bar takes colour values, not classes).
export function useTabBarTheme() {
  const [card, muted, mutedForeground, primaryStrong] = useCSSVariable([
    '--card',
    '--muted',
    '--muted-foreground',
    '--primary-strong',
  ]);
  return buildTabBarTheme({
    card: asString(card),
    muted: asString(muted),
    mutedForeground: asString(mutedForeground),
    primaryStrong: asString(primaryStrong),
  });
}

import type { ColorValue } from 'react-native';

import { toCssColor } from './nav-theme';

export type TabBarTokens = {
  card: string;
  muted: string;
  mutedForeground: string;
  primaryStrong: string;
};

export type TabBarTheme = {
  backgroundColor: ColorValue;
  indicatorColor: ColorValue;
  rippleColor: ColorValue;
  iconColor: { default: ColorValue; selected: ColorValue };
  labelStyle: { default: { color: ColorValue }; selected: { color: ColorValue } };
};

// A flat Material tab bar on the card surface: the selected tab takes the strong green, the rest are muted.
// Until every token resolves it returns {} so the system defaults apply instead of a half themed bar.
export function buildTabBarTheme(tokens: Partial<TabBarTokens>): Partial<TabBarTheme> {
  const { card, muted, mutedForeground, primaryStrong } = tokens;
  if (
    card === undefined ||
    muted === undefined ||
    mutedForeground === undefined ||
    primaryStrong === undefined
  ) {
    return {};
  }
  const unselected = toCssColor(mutedForeground);
  const selected = toCssColor(primaryStrong);
  return {
    backgroundColor: toCssColor(card),
    indicatorColor: toCssColor(muted),
    rippleColor: toCssColor(muted),
    iconColor: { default: unselected, selected },
    labelStyle: { default: { color: unselected }, selected: { color: selected } },
  };
}

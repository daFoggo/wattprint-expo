import { useCSSVariable } from 'uniwind';

import { toCssColor } from '@/lib/nav-theme';

// Skia takes a CSS colour string, not a class. The primary token is a "r g b" triple that changes
// with the theme, so reading it here re-colours the chart on a theme switch.
export function useChartBarColor(): string | null {
  const primary = useCSSVariable('--primary');
  return typeof primary === 'string' ? toCssColor(primary) : null;
}

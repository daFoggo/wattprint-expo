import { Profiler, type ReactNode } from 'react';

import { benchLog } from '@/lib/bench-log';

const counts = new Map<string, number>();

export const getRenderCount = (id: string): number => counts.get(id) ?? 0;
export const resetRenderCounts = (): void => counts.clear();

// One line with every counter; the screens call it when they unmount.
export function logRenderCounts(): void {
  benchLog({ event: 'render-counts', counts: Object.fromEntries(counts) });
}

// Counts commits of the wrapped subtree. React's Profiler only reports in development builds, so use
// it for re-render counts, not for release timings. A commit of a virtualized list includes its
// scroll-driven recycling, so counts are NOT comparable across list implementations (FlashList vs
// FlatList); compare the same list before and after a change. Only the mount commit is logged (a
// scrolling list would flood logcat); read the totals from `logRenderCounts()`.
export function RenderCount({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Profiler
      id={id}
      onRender={(_id, phase, actualDuration) => {
        const count = getRenderCount(id) + 1;
        counts.set(id, count);
        if (phase === 'mount') {
          benchLog({
            event: 'render',
            id,
            phase,
            count,
            ms: Math.round(actualDuration * 100) / 100,
          });
        }
      }}
    >
      {children}
    </Profiler>
  );
}

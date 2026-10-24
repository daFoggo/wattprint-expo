import { Profiler, type ReactNode } from 'react';

import { benchLog } from '@/features/lab/bench/bench-log';

const counts = new Map<string, number>();

export const getRenderCount = (id: string): number => counts.get(id) ?? 0;
export const resetRenderCounts = (): void => counts.clear();

// Counts commits of the wrapped subtree and logs each one. React's Profiler only reports in
// development builds, so use it for re-render counts, not for release timings.
export function RenderCount({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Profiler
      id={id}
      onRender={(_id, phase, actualDuration) => {
        const count = getRenderCount(id) + 1;
        counts.set(id, count);
        benchLog({ event: 'render', id, phase, count, ms: Math.round(actualDuration * 100) / 100 });
      }}
    >
      {children}
    </Profiler>
  );
}

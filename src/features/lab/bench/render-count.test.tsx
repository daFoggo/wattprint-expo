import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  RenderCount,
  getRenderCount,
  logRenderCounts,
  resetRenderCounts,
} from '@/features/lab/bench/render-count';

beforeEach(() => {
  resetRenderCounts();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('RenderCount', () => {
  it('counts commits of the wrapped subtree and logs them', async () => {
    const { rerender } = await render(
      <RenderCount id="list">
        <Text>a</Text>
      </RenderCount>,
    );
    expect(getRenderCount('list')).toBe(1);
    await rerender(
      <RenderCount id="list">
        <Text>b</Text>
      </RenderCount>,
    );
    expect(getRenderCount('list')).toBe(2);
    expect(getRenderCount('other')).toBe(0);
    // Only the mount commit is logged; the update is counted silently.
    expect((console.log as jest.Mock).mock.calls).toHaveLength(1);
    const [tag, json] = (console.log as jest.Mock).mock.calls[0];
    expect(tag).toBe('[BENCH]');
    expect(JSON.parse(json)).toMatchObject({
      event: 'render',
      id: 'list',
      phase: 'mount',
      count: 1,
    });
  });

  it('logs all counters in one line', async () => {
    await render(
      <RenderCount id="a">
        <Text>a</Text>
      </RenderCount>,
    );
    logRenderCounts();
    const [, json] = (console.log as jest.Mock).mock.calls.at(-1);
    expect(JSON.parse(json)).toEqual({ event: 'render-counts', counts: { a: 1 } });
  });
});

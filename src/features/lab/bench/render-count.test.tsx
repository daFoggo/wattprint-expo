import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RenderCount, getRenderCount, resetRenderCounts } from '@/features/lab/bench/render-count';

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
    const [tag, json] = (console.log as jest.Mock).mock.calls[0];
    expect(tag).toBe('[BENCH]');
    expect(JSON.parse(json)).toMatchObject({
      event: 'render',
      id: 'list',
      phase: 'mount',
      count: 1,
    });
  });
});

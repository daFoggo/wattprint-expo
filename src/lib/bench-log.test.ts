import { env } from '@/env';
import { benchLog } from '@/lib/bench-log';

jest.mock('@/env', () => ({ env: { EXPO_PUBLIC_APP_ENV: 'development' } }));
const mockEnv = env as { EXPO_PUBLIC_APP_ENV: string };

let spy: jest.SpyInstance;
beforeEach(() => {
  spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  mockEnv.EXPO_PUBLIC_APP_ENV = 'development';
  spy.mockRestore();
});

describe('benchLog', () => {
  it('logs one [BENCH] line with a JSON payload', () => {
    benchLog({ event: 'x', ms: 3 });
    expect(spy).toHaveBeenCalledWith('[BENCH]', '{"event":"x","ms":3}');
  });

  it('also logs in preview builds', () => {
    mockEnv.EXPO_PUBLIC_APP_ENV = 'preview';
    benchLog({ event: 'x' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('is silent in production', () => {
    mockEnv.EXPO_PUBLIC_APP_ENV = 'production';
    benchLog({ event: 'x' });
    expect(spy).not.toHaveBeenCalled();
  });
});

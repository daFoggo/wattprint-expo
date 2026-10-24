import { benchLog } from '@/features/lab/bench/bench-log';

it('logs one [BENCH] line with a JSON payload', () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  benchLog({ event: 'x', ms: 3 });
  expect(spy).toHaveBeenCalledWith('[BENCH]', '{"event":"x","ms":3}');
  spy.mockRestore();
});

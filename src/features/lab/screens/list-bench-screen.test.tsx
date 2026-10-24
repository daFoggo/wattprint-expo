import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import '@/i18n';
import * as api from '@/features/lab/api';
import { labKeys } from '@/features/lab/queries';
import { ListBenchScreen, parseBenchParams } from '@/features/lab/screens/list-bench-screen';
import type { Quote } from '@/features/lab/schemas';

jest.mock('@/features/lab/api');

const quotes = (n: number): Quote[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, quote: `Quote ${i + 1}`, author: 'A' }));

// resetAllMocks would also wipe FlashList's jest layout mocks, so reset only the api mocks.
const resetApiMocks = () =>
  Object.values(api).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());

let queryClient: QueryClient;

async function renderScreen(impl: string, n: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ListBenchScreen impl={impl} n={n} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
  resetApiMocks();
});

describe('parseBenchParams', () => {
  it('accepts the supported impls and sizes, also as arrays', () => {
    expect(parseBenchParams('flat', '1000')).toEqual({ impl: 'flat', n: 1000 });
    expect(parseBenchParams(['flash'], ['100'])).toEqual({ impl: 'flash', n: 100 });
  });

  it('falls back to flash / 500 for anything else', () => {
    expect(parseBenchParams(undefined, undefined)).toEqual({ impl: 'flash', n: 500 });
    expect(parseBenchParams('other', '42')).toEqual({ impl: 'flash', n: 500 });
  });
});

describe.each(['flash', 'flat'] as const)('ListBenchScreen (%s)', (impl) => {
  it('requests n quotes, shows n quotes in the header and renders rows', async () => {
    (api.fetchQuotes as jest.Mock).mockResolvedValue({ quotes: quotes(100) });
    await renderScreen(impl, '100');
    expect(await screen.findByText('Quote 1')).toBeTruthy();
    expect(api.fetchQuotes).toHaveBeenCalledWith(100, expect.anything());
    expect(screen.getByRole('header')).toHaveTextContent(/100 quotes/);
  });

  it('shows the loading state first', async () => {
    (api.fetchQuotes as jest.Mock).mockReturnValue(new Promise(() => undefined));
    await renderScreen(impl, '500');
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});

it('shows the error state when the request fails', async () => {
  (api.fetchQuotes as jest.Mock).mockRejectedValue(new Error('boom'));
  await renderScreen('flat', '500');
  expect(await screen.findByText('boom')).toBeTruthy();
});

describe('bench-data log', () => {
  const dataEntries = () =>
    (console.log as jest.Mock).mock.calls
      .filter(([tag]) => tag === '[BENCH]')
      .map(([, json]) => JSON.parse(json as string))
      .filter((entry) => entry.event === 'bench-data');

  it('says the data was fetched when the screen waited for it', async () => {
    (api.fetchQuotes as jest.Mock).mockResolvedValue({ quotes: quotes(100) });
    await renderScreen('flat', '100');
    await screen.findByText('Quote 1');
    expect(dataEntries()).toEqual([
      expect.objectContaining({ impl: 'flat', n: 100, cached: false }),
    ]);
  });

  it('says the data was cached when it predates the mount (prefetched)', async () => {
    queryClient.setQueryData(
      labKeys.quotes(100),
      { quotes: quotes(100) },
      { updatedAt: Date.now() - 5000 },
    );
    await renderScreen('flat', '100');
    await screen.findByText('Quote 1');
    expect(dataEntries()).toEqual([expect.objectContaining({ cached: true, msSinceMount: 0 })]);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as api from '@/features/lab/api';
import { useProductSearch } from '@/features/lab/hooks/use-product-search';
import type { Product } from '@/features/lab/schemas';

jest.mock('@/features/lab/api');

const product = (id: number, title: string): Product => ({
  id,
  title,
  description: 'd',
  category: 'c',
  price: 1,
  rating: 4,
  thumbnail: 't',
});

let queryClient: QueryClient;

function setup() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  // TanStack Query re-renders only for the result fields read during render, so read them here.
  return renderHook(
    () => {
      const search = useProductSearch();
      void [search.query.data, search.query.isPlaceholderData];
      return search;
    },
    { wrapper },
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [product(1, 'All')] });
  (api.searchProducts as jest.Mock).mockImplementation(async ({ q }: { q: string }) => ({
    products: [product(2, `found ${q}`)],
  }));
});
afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
  jest.resetAllMocks();
});

// Let queued promise callbacks and query notifications run (a few microtask rounds).
const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await jest.advanceTimersByTimeAsync(0);
  });

describe('useProductSearch', () => {
  it('loads the full list first', async () => {
    const { result } = await setup();
    await settle();
    expect(result.current.query.data?.products[0].title).toBe('All');
    expect(api.searchProducts).not.toHaveBeenCalled();
  });

  it('does not search until 300 ms after the last keystroke', async () => {
    const { result } = await setup();
    await settle();

    await act(async () => result.current.setText('p'));
    await act(async () => jest.advanceTimersByTimeAsync(200));
    await act(async () => result.current.setText('ph'));
    await act(async () => jest.advanceTimersByTimeAsync(299));
    expect(api.searchProducts).not.toHaveBeenCalled();
    expect(result.current.text).toBe('ph');
    expect(result.current.q).toBe('');

    await act(async () => jest.advanceTimersByTimeAsync(1));
    await settle();
    expect(result.current.q).toBe('ph');
    expect(api.searchProducts).toHaveBeenCalledTimes(1);
    expect((api.searchProducts as jest.Mock).mock.calls[0][0]).toEqual({ q: 'ph', limit: 30 });
    expect(result.current.query.data?.products[0].title).toBe('found ph');
    expect(result.current.shownQ).toBe('ph');
  });

  it('keeps the previous results while the next query loads', async () => {
    const { result } = await setup();
    await settle();
    (api.searchProducts as jest.Mock).mockImplementation(() => new Promise(() => undefined));
    await act(async () => result.current.setText('zzz'));
    await act(async () => jest.advanceTimersByTimeAsync(300));
    expect(result.current.query.isPlaceholderData).toBe(true);
    expect(result.current.q).toBe('zzz');
    expect(result.current.shownQ).toBe('');
    expect(result.current.query.data?.products[0].title).toBe('All');
  });

  it('treats a whitespace-only input as the empty query', async () => {
    const { result } = await setup();
    await act(async () => result.current.setText('   '));
    await act(async () => jest.advanceTimersByTimeAsync(300));
    expect(result.current.q).toBe('');
    expect(api.searchProducts).not.toHaveBeenCalled();
  });
});

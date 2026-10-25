import { QueryClient } from '@tanstack/react-query';

import * as api from '@/features/lab/api';
import {
  findCachedProduct,
  labKeys,
  productListQueryOptions,
  prefetchQuotes,
  productQueryOptions,
  quotesQueryOptions,
} from '@/features/lab/queries';
import type { Product } from '@/features/lab/schemas';

jest.mock('@/features/lab/api');

const row = (id: number): Product => ({
  id,
  title: `P${id}`,
  description: 'd',
  category: 'c',
  price: 1,
  rating: 4,
  thumbnail: 't',
});

describe('labKeys', () => {
  it('nests every key under the feature root', () => {
    expect(labKeys.all).toEqual(['lab']);
    expect(labKeys.products()).toEqual(['lab', 'products']);
    expect(labKeys.productList({ q: 'a', limit: 30 })).toEqual([
      'lab',
      'products',
      'list',
      { q: 'a', limit: 30 },
    ]);
    expect(labKeys.product(5)).toEqual(['lab', 'products', 'detail', 5]);
    expect(labKeys.quotes(500)).toEqual(['lab', 'quotes', 500]);
  });

  it('puts every queryFn variable in the key', () => {
    expect(productListQueryOptions({ q: 'a', limit: 30 }).queryKey).not.toEqual(
      productListQueryOptions({ q: 'b', limit: 30 }).queryKey,
    );
    expect(productListQueryOptions({ q: 'a', limit: 30 }).queryKey).not.toEqual(
      productListQueryOptions({ q: 'a', limit: 10 }).queryKey,
    );
    expect(quotesQueryOptions(100).queryKey).not.toEqual(quotesQueryOptions(500).queryKey);
  });
});

describe('query functions', () => {
  const signal = new AbortController().signal;
  const ctx = { signal } as never;

  it('lists all products for an empty query and searches otherwise', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [] });
    (api.searchProducts as jest.Mock).mockResolvedValue({ products: [] });
    await productListQueryOptions({ q: '', limit: 30 }).queryFn?.(ctx);
    expect(api.fetchProducts).toHaveBeenCalledWith({ limit: 30 }, signal);
    await productListQueryOptions({ q: 'phone', limit: 30 }).queryFn?.(ctx);
    expect(api.searchProducts).toHaveBeenCalledWith({ q: 'phone', limit: 30 }, signal);
  });
});

describe('detail placeholderData', () => {
  // Cached data schedules a gc timer that would keep the Jest worker alive.
  const clients: QueryClient[] = [];
  const makeClient = () => {
    const qc = new QueryClient();
    clients.push(qc);
    return qc;
  };
  afterEach(() => clients.splice(0).forEach((qc) => qc.clear()));

  it('finds a product row in any cached list', () => {
    const qc = makeClient();
    qc.setQueryData(labKeys.productList({ q: '', limit: 30 }), { products: [row(1), row(2)] });
    qc.setQueryData(labKeys.productList({ q: 'x', limit: 30 }), { products: [row(3)] });
    expect(findCachedProduct(qc, 3)?.title).toBe('P3');
    expect(findCachedProduct(qc, 99)).toBeUndefined();
  });

  it('uses the cached row as placeholder only when given a queryClient', () => {
    const qc = makeClient();
    qc.setQueryData(labKeys.productList({ q: '', limit: 30 }), { products: [row(2)] });
    const placeholder = (client?: QueryClient) =>
      (productQueryOptions(2, client).placeholderData as () => Product | undefined)();
    expect(placeholder(qc)?.id).toBe(2);
    expect(placeholder()).toBeUndefined();
  });
});

describe('prefetchQuotes', () => {
  it('puts the quotes in the cache', async () => {
    (api.fetchQuotes as jest.Mock).mockResolvedValue({ quotes: [] });
    const qc = new QueryClient();
    await prefetchQuotes(qc, 5);
    expect(qc.getQueryData(labKeys.quotes(5))).toEqual({ quotes: [] });
    qc.clear();
  });

  it('resolves, never rejects, when the api fails', async () => {
    (api.fetchQuotes as jest.Mock).mockRejectedValue(new Error('down'));
    const qc = new QueryClient();
    await expect(prefetchQuotes(qc, 6)).resolves.toBeUndefined();
    expect(qc.getQueryData(labKeys.quotes(6))).toBeUndefined();
    qc.clear();
  });
});

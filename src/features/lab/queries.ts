import { queryOptions, type QueryClient } from '@tanstack/react-query';

import { fetchProduct, fetchProducts, fetchQuotes, searchProducts } from '@/features/lab/api';
import type { Product, ProductList } from '@/features/lab/schemas';

export const PRODUCT_PAGE_LIMIT = 30;

// Every variable the queryFn uses is part of the key.
export const labKeys = {
  all: ['lab'] as const,
  products: () => [...labKeys.all, 'products'] as const,
  productList: (params: { q: string; limit: number }) =>
    [...labKeys.products(), 'list', params] as const,
  product: (id: number) => [...labKeys.products(), 'detail', id] as const,
  quotes: (n: number) => [...labKeys.all, 'quotes', n] as const,
};

export const productListQueryOptions = (params: { q: string; limit: number }) =>
  queryOptions({
    queryKey: labKeys.productList(params),
    queryFn: ({ signal }) =>
      params.q === ''
        ? fetchProducts({ limit: params.limit }, signal)
        : searchProducts(params, signal),
  });

// A product row from any cached list, used to paint the detail screen before its own request ends.
export function findCachedProduct(queryClient: QueryClient, id: number): Product | undefined {
  const lists = queryClient.getQueriesData<ProductList>({
    queryKey: [...labKeys.products(), 'list'],
  });
  for (const [, data] of lists) {
    const row = data?.products.find((p) => p.id === id);
    if (row) return row;
  }
  return undefined;
}

// Pass a queryClient to use the cached list row as placeholderData; omit it to measure without.
export const productQueryOptions = (id: number, queryClient?: QueryClient) =>
  // Explicit generics: inference mistakes the placeholderData function for the data type.
  queryOptions<Product, Error, Product, ReturnType<typeof labKeys.product>>({
    queryKey: labKeys.product(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    placeholderData: () => (queryClient ? findCachedProduct(queryClient, id) : undefined),
  });

export const quotesQueryOptions = (n: number) =>
  queryOptions({
    queryKey: labKeys.quotes(n),
    queryFn: ({ signal }) => fetchQuotes(n, signal),
  });

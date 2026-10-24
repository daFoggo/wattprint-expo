import { benchLog } from '@/lib/bench-log';
import {
  productListSchema,
  productSchema,
  quoteListSchema,
  type Product,
  type ProductList,
  type QuoteList,
} from '@/features/lab/schemas';
import { createApiClient } from '@/lib/http';

export const LAB_BASE_URL = 'https://dummyjson.com';

const client = createApiClient({
  baseUrl: LAB_BASE_URL,
  onRequest: ({ method, path, status, ms }) =>
    benchLog({ event: 'http', method, path, status, ms }),
});

export function fetchProducts(
  { limit }: { limit: number },
  signal?: AbortSignal,
): Promise<ProductList> {
  return client.request(`/products?limit=${limit}`, { schema: productListSchema, signal });
}

export function searchProducts(
  { q, limit }: { q: string; limit: number },
  signal?: AbortSignal,
): Promise<ProductList> {
  return client.request(`/products/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
    schema: productListSchema,
    signal,
  });
}

export function fetchProduct(id: number, signal?: AbortSignal): Promise<Product> {
  return client.request(`/products/${id}`, { schema: productSchema, signal });
}

export function fetchQuotes(n: number, signal?: AbortSignal): Promise<QuoteList> {
  return client.request(`/quotes?limit=${n}`, { schema: quoteListSchema, signal });
}

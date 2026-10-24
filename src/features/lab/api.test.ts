import { ApiError, ContractError } from '@/lib/errors';
import {
  LAB_BASE_URL,
  fetchProduct,
  fetchProducts,
  fetchQuotes,
  searchProducts,
} from '@/features/lab/api';

const product = {
  id: 1,
  title: 'Phone',
  description: 'd',
  category: 'c',
  price: 1,
  rating: 4,
  thumbnail: 't',
};

const fetchMock = jest.fn();
const reply = (status: number, body: unknown) => ({
  ok: status < 300,
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const calledUrl = () => fetchMock.mock.calls[0][0] as string;

describe('lab api', () => {
  it('targets dummyjson', () => {
    expect(LAB_BASE_URL).toBe('https://dummyjson.com');
  });

  it('fetchProducts requests a page and returns parsed products', async () => {
    fetchMock.mockResolvedValue(reply(200, { products: [product], total: 194 }));
    await expect(fetchProducts({ limit: 30 })).resolves.toEqual({ products: [product] });
    expect(calledUrl()).toBe('https://dummyjson.com/products?limit=30');
  });

  it('searchProducts encodes the query', async () => {
    fetchMock.mockResolvedValue(reply(200, { products: [], total: 0 }));
    await searchProducts({ q: 'smart phone&x', limit: 10 });
    expect(calledUrl()).toBe('https://dummyjson.com/products/search?q=smart%20phone%26x&limit=10');
  });

  it('fetchProduct requests one product', async () => {
    fetchMock.mockResolvedValue(reply(200, product));
    await expect(fetchProduct(7)).resolves.toEqual(product);
    expect(calledUrl()).toBe('https://dummyjson.com/products/7');
  });

  it('fetchQuotes asks for n quotes', async () => {
    fetchMock.mockResolvedValue(reply(200, { quotes: [{ id: 1, quote: 'q', author: 'a' }] }));
    await expect(fetchQuotes(500)).resolves.toEqual({
      quotes: [{ id: 1, quote: 'q', author: 'a' }],
    });
    expect(calledUrl()).toBe('https://dummyjson.com/quotes?limit=500');
  });

  it('throws ApiError for a 404 and ContractError for a malformed body', async () => {
    fetchMock.mockResolvedValueOnce(reply(404, { message: 'Product not found' }));
    await expect(fetchProduct(9)).rejects.toBeInstanceOf(ApiError);
    fetchMock.mockResolvedValueOnce(reply(200, { products: [{ id: 'x' }] }));
    await expect(fetchProducts({ limit: 1 })).rejects.toBeInstanceOf(ContractError);
  });

  it('logs each request as a [BENCH] line', async () => {
    fetchMock.mockResolvedValue(reply(200, product));
    await fetchProduct(2);
    const [tag, json] = (console.log as jest.Mock).mock.calls[0];
    expect(tag).toBe('[BENCH]');
    expect(JSON.parse(json)).toMatchObject({ event: 'http', path: '/products/2', status: 200 });
  });
});

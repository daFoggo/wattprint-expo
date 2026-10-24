import { productListSchema, productSchema, quoteListSchema } from '@/features/lab/schemas';

const product = {
  id: 1,
  title: 'Phone',
  description: 'A phone',
  category: 'smartphones',
  price: 99.5,
  rating: 4.4,
  thumbnail: 'https://cdn.dummyjson.com/p/1.webp',
  stock: 5,
  reviews: [{ rating: 5 }],
};

describe('lab schemas', () => {
  it('keeps only the product fields the UI uses', () => {
    expect(productSchema.parse(product)).toEqual({
      id: 1,
      title: 'Phone',
      description: 'A phone',
      category: 'smartphones',
      price: 99.5,
      rating: 4.4,
      thumbnail: 'https://cdn.dummyjson.com/p/1.webp',
    });
  });

  it('parses a product list and drops paging fields it does not use', () => {
    const parsed = productListSchema.parse({ products: [product], total: 194, skip: 0, limit: 30 });
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0].title).toBe('Phone');
    expect(parsed).not.toHaveProperty('skip');
  });

  it('rejects a product with a wrong type', () => {
    expect(() => productSchema.parse({ ...product, price: '99' })).toThrow();
  });

  it('parses quotes and keeps id, quote and author', () => {
    const parsed = quoteListSchema.parse({
      quotes: [{ id: 1, quote: 'Be kind', author: 'Someone', extra: 1 }],
      total: 1454,
      skip: 0,
      limit: 1,
    });
    expect(parsed.quotes).toEqual([{ id: 1, quote: 'Be kind', author: 'Someone' }]);
  });
});

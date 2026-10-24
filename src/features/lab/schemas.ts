import { z } from 'zod';

// Only the fields the UI uses; z.object strips the rest.
export const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  rating: z.number(),
  thumbnail: z.string(),
});

export const productListSchema = z.object({ products: z.array(productSchema) });

export const quoteSchema = z.object({
  id: z.number(),
  quote: z.string(),
  author: z.string(),
});

export const quoteListSchema = z.object({ quotes: z.array(quoteSchema) });

export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type QuoteList = z.infer<typeof quoteListSchema>;

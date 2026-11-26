import { z } from 'zod';
import { StackCountSchema } from './domain';

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ingredients: z.array(StackCountSchema).min(1),
  durationS: z.number().int().min(1),
  blueprintPrice: z.number().int().min(0),
  floorPrice: z.number().int().min(1),
  line: z.string().min(1).max(80),
  assetKey: z.string().min(1),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductsSchema = z.object({ products: z.array(ProductSchema) });
export type Products = z.infer<typeof ProductsSchema>;

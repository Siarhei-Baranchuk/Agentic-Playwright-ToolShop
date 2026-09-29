import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';
import { ProductSchema } from './productSchema';

/*
 * Favorite schemas, built from the OpenAPI contract. Response schemas list
 * no `required` properties, so every property is optional.
 */

/** `FavoriteRequest` — body of `POST /favorites`. */
export const FavoriteRequestSchema = z.strictObject({
    product_id: z.string().optional(),
});

/** `FavoriteResponse` — `POST /favorites`, `GET /favorites/{favoriteId}`. */
export const FavoriteSchema = z.strictObject({
    product_id: z.string().optional(),
    user_id: z.string().optional(),
    id: z.string().optional(),
});

/** `FavoriteWithProductResponse` — items of `GET /favorites`. */
export const FavoriteWithProductSchema = z.strictObject({
    product_id: z.string().optional(),
    user_id: z.string().optional(),
    id: z.string().optional(),
    product: ProductSchema.optional(),
});

export const FavoriteWithProductListSchema = z.array(FavoriteWithProductSchema);

export type FavoriteRequest = zOutput<typeof FavoriteRequestSchema>;
export type Favorite = zOutput<typeof FavoriteSchema>;
export type FavoriteWithProductList = zOutput<
    typeof FavoriteWithProductListSchema
>;

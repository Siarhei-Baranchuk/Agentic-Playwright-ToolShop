import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';
import { BrandSchema } from './brandSchema';
import { CategorySchema } from './categorySchema';
import { ImageSchema } from './imageSchema';

/*
 * Product schemas, built from the OpenAPI contract. Response schemas list
 * no `required` properties, so every property is optional; unknown
 * properties are still rejected.
 */

/** `ProductRequest` — body of POST / PUT / PATCH `/products`. */
export const ProductRequestSchema = z.strictObject({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    category_id: z.string().optional(),
    brand_id: z.string().optional(),
    product_image_id: z.string().optional(),
    is_location_offer: z.boolean().optional(),
    is_rental: z.boolean().optional(),
    co2_rating: z.string().optional(),
});

/** `ProductResponse` */
export const ProductSchema = z.strictObject({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    is_location_offer: z.boolean().optional(),
    is_rental: z.boolean().optional(),
    in_stock: z.boolean().optional(),
    co2_rating: z.string().optional(),
    is_eco_friendly: z.boolean().optional(),
    brand: BrandSchema.optional(),
    category: CategorySchema.optional(),
    product_image: ImageSchema.optional(),
});

/** `PaginatedProductResponse` — `GET|QUERY /products`, `GET|QUERY /products/search`. */
export const PaginatedProductSchema = z.strictObject({
    current_page: z.int().optional(),
    data: z.array(ProductSchema).optional(),
    from: z.int().optional(),
    last_page: z.int().optional(),
    per_page: z.int().optional(),
    to: z.int().optional(),
    total: z.int().optional(),
});

/** `GET /products/{productId}/related` — array of `ProductResponse`. */
export const ProductListSchema = z.array(ProductSchema);

export type ProductRequest = zOutput<typeof ProductRequestSchema>;
export type Product = zOutput<typeof ProductSchema>;
export type PaginatedProducts = zOutput<typeof PaginatedProductSchema>;
export type ProductList = zOutput<typeof ProductListSchema>;

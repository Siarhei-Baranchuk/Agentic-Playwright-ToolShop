import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * Category schemas, built from the OpenAPI contract. Response schemas list
 * no `required` properties, so every property is optional; unknown
 * properties are still rejected.
 */

/** `CategoryRequest` — body of POST / PUT / PATCH `/categories`. */
export const CategoryRequestSchema = z.strictObject({
    name: z.string().optional(),
    slug: z.string().optional(),
    parent_id: z.string().nullable().optional(),
});

/** `CategoryResponse` — recursive through `sub_categories`. */
export const CategorySchema = z.strictObject({
    id: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    get sub_categories() {
        return z.array(CategorySchema).optional();
    },
});

/** `CategoryTreeResponse` — same shape as `CategoryResponse`. */
export const CategoryTreeSchema = z.strictObject({
    id: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    sub_categories: z.array(CategorySchema).optional(),
});

/** `GET /categories`, `GET|QUERY /categories/search` */
export const CategoryListSchema = z.array(CategorySchema);

/** `GET|QUERY /categories/tree` */
export const CategoryTreeListSchema = z.array(CategoryTreeSchema);

export type CategoryRequest = zOutput<typeof CategoryRequestSchema>;
export type Category = zOutput<typeof CategorySchema>;
export type CategoryTree = zOutput<typeof CategoryTreeSchema>;
export type CategoryList = zOutput<typeof CategoryListSchema>;
export type CategoryTreeList = zOutput<typeof CategoryTreeListSchema>;

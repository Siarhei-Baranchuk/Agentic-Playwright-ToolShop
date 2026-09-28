import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * Brand schemas, built from the OpenAPI contract. Response schemas list no
 * `required` properties, so every property is optional; unknown properties
 * are still rejected.
 */

/** `BrandRequest` — body of POST / PUT / PATCH `/brands`. */
export const BrandRequestSchema = z.strictObject({
    name: z.string().optional(),
    slug: z.string().optional(),
});

/** `BrandResponse` */
export const BrandSchema = z.strictObject({
    id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
});

/** `GET /brands`, `GET|QUERY /brands/search` — array of `BrandResponse`. */
export const BrandListSchema = z.array(BrandSchema);

export type BrandRequest = zOutput<typeof BrandRequestSchema>;
export type Brand = zOutput<typeof BrandSchema>;
export type BrandList = zOutput<typeof BrandListSchema>;

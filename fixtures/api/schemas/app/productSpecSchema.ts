import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * Product spec schemas, built from the OpenAPI contract.
 */

/** Body of `POST /products/{productId}/specs` (required: spec_name, spec_value). */
export const ProductSpecRequestSchema = z.strictObject({
    spec_name: z.string(),
    spec_value: z.string(),
    spec_unit: z.string().nullable().optional(),
});

/** `ProductSpecResponse` — no `required` properties, so every property is optional. */
export const ProductSpecSchema = z.strictObject({
    id: z.string().optional(),
    product_id: z.string().optional(),
    spec_name: z.string().optional(),
    spec_value: z.string().optional(),
    spec_unit: z.string().nullable().optional(),
});

/** `GET /products/{productId}/specs` — array of `ProductSpecResponse`. */
export const ProductSpecListSchema = z.array(ProductSpecSchema);

/**
 * Item of `GET /product-specs/names`.
 * FIXME: the spec documents 200 without a body schema; shape captured live
 * ({"name": "Weight", "values": ["1.5"], "unit": "kg"}).
 */
export const ProductSpecNameSchema = z.strictObject({
    name: z.string(),
    values: z.array(z.string()),
    unit: z.string().nullable(),
});

export const ProductSpecNameListSchema = z.array(ProductSpecNameSchema);

export type ProductSpecRequest = zOutput<typeof ProductSpecRequestSchema>;
export type ProductSpec = zOutput<typeof ProductSpecSchema>;
export type ProductSpecList = zOutput<typeof ProductSpecListSchema>;
export type ProductSpecNameList = zOutput<typeof ProductSpecNameListSchema>;

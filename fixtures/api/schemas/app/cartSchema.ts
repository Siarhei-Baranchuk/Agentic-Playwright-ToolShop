import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';
import { ProductSchema } from './productSchema';

/*
 * Cart schemas, built from the OpenAPI contract. The contract documents a
 * cart only as `{ id }`; every other field of `GET /carts/{cartId}` is
 * undocumented (defect #26) and typed from live responses.
 */

/** `CartCreatedResponse` — `POST /carts`. */
export const CartCreatedSchema = z.strictObject({
    id: z.string().optional(),
});

/** `CartItemAddedResponse` — `POST /carts/{id}` (and, undocumented, `PUT .../quantity`). */
export const CartItemAddedSchema = z.strictObject({
    result: z.string().optional(),
});

/** FIXME: undocumented — item of `cart_items` (defect #26). */
export const CartItemSchema = z.strictObject({
    id: z.string(),
    quantity: z.int(),
    discount_percentage: z.number().nullable(),
    discounted_price: z.number().optional(),
    cart_id: z.string(),
    product_id: z.string(),
    product: ProductSchema,
});

/** `CartResponse` — `GET /carts/{cartId}`. */
export const CartSchema = z.strictObject({
    id: z.string().optional(),
    // FIXME: undocumented — see docs/test-plan.md, defect #26
    additional_discount_percentage: z.number().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    cart_items: z.array(CartItemSchema).optional(),
});

export type CartCreated = zOutput<typeof CartCreatedSchema>;
export type CartItemAdded = zOutput<typeof CartItemAddedSchema>;
export type Cart = zOutput<typeof CartSchema>;

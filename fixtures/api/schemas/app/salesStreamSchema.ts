import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/**
 * JSON `data` of a `sale` event of `GET /sales-stream`.
 * FIXME: the spec types the stream as a plain string; the event payload is
 * captured from live responses.
 */
export const SaleEventSchema = z.strictObject({
    seq: z.int(),
    at: z.string(),
    product_id: z.string(),
    name: z.string(),
    unit_price: z.number(),
    quantity: z.int(),
    amount: z.number(),
    running_total: z.number(),
    remaining_stock: z.int(),
    sold_out: z.boolean(),
    buyer: z.string(),
    city: z.string(),
});

export type SaleEvent = zOutput<typeof SaleEventSchema>;

import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/** `GET /postcode-lookup` 200 — address details (no `required` properties in the contract). */
export const PostcodeLookupSchema = z.strictObject({
    street: z.string().optional(),
    house_number: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postcode: z.string().optional(),
});

export type PostcodeLookup = zOutput<typeof PostcodeLookupSchema>;

import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/** `UpdateResponse` — 200 body of PUT / PATCH endpoints: {"success": true}. */
export const UpdateResponseSchema = z.strictObject({
    success: z.boolean(),
});

export type UpdateResponse = zOutput<typeof UpdateResponseSchema>;

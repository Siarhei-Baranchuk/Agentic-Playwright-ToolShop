import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/**
 * `ImageResponse`, built from the OpenAPI contract. No `required`
 * properties are listed, so every property is optional.
 */
export const ImageSchema = z.strictObject({
    by_name: z.string().optional(),
    by_url: z.string().optional(),
    source_name: z.string().optional(),
    source_url: z.string().optional(),
    file_name: z.string().optional(),
    title: z.string().optional(),
    id: z.string().optional(),
});

/** `GET /images` — array of `ImageResponse`. */
export const ImageListSchema = z.array(ImageSchema);

export type Image = zOutput<typeof ImageSchema>;
export type ImageList = zOutput<typeof ImageListSchema>;

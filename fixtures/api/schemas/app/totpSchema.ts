import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * TOTP schemas, built from the OpenAPI contract. The contract lists no
 * `required` properties, so every property is optional.
 */

/** `TOTPSetupResponse` — `POST /totp/setup`. */
export const TotpSetupResponseSchema = z.strictObject({
    secret: z.string().optional(),
    qrCodeUrl: z.string().optional(),
});

/** `TOTPVerifyResponse` — `POST /totp/verify`. */
export const TotpVerifyResponseSchema = z.strictObject({
    message: z.string().optional(),
});

/** `TOTPErrorResponse` — 400 of `POST /totp/setup` and `POST /totp/verify`. */
export const TotpErrorResponseSchema = z.strictObject({
    error: z.string().optional(),
});

export type TotpSetupResponse = zOutput<typeof TotpSetupResponseSchema>;
export type TotpVerifyResponse = zOutput<typeof TotpVerifyResponseSchema>;
export type TotpErrorResponse = zOutput<typeof TotpErrorResponseSchema>;

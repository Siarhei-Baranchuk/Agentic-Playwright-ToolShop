import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * Error-response schemas for the demo API (practicesoftwaretesting.com).
 *
 * Schemas named after an OpenAPI `components.responses` entry mirror that
 * contract. The others cover responses the spec lists without a body (or
 * does not list at all); their shape is captured from live responses per
 * the "Explore Before Generate" fallback and marked FIXME (missing docs).
 */

/** `UnauthorizedResponse` — 401 when the request is not authenticated. */
export const UnauthorizedResponseSchema = z.strictObject({
    message: z.string(),
});

/**
 * 401 body of `POST /users/login` for rejected credentials.
 * FIXME: the spec documents only 200 for login; live shape
 * {"error": "Unauthorized"} / {"error": "Invalid login request"}.
 */
export const LoginErrorResponseSchema = z.strictObject({
    error: z.string(),
});

/**
 * 403 Forbidden — authenticated but the role is not allowed.
 * FIXME: not documented in the spec; live shape {"message": "Forbidden"}.
 */
export const ForbiddenResponseSchema = z.strictObject({
    message: z.string(),
});

/** `ItemNotFoundResponse` — 404 for a single resource ("Requested item not found"). */
export const ItemNotFoundResponseSchema = z.strictObject({
    message: z.string(),
});

/** `ResourceNotFoundResponse` — 404 for a collection ("Resource not found"). */
export const ResourceNotFoundResponseSchema = z.strictObject({
    message: z.string(),
});

/** `MethodNotAllowedResponse` — 405 when the HTTP method is not allowed on the route. */
export const MethodNotAllowedResponseSchema = z.strictObject({
    message: z.string(),
});

/**
 * `DuplicateConflictResponse` — 409 when a unique value (e.g. slug) is taken:
 * a field-level MessageBag, or a single message from the global handler.
 */
export const DuplicateConflictResponseSchema = z.union([
    z.record(z.string(), z.array(z.string())),
    z.strictObject({ message: z.string() }),
]);

/**
 * `ConflictResponse` — 409 when the entity is used elsewhere.
 * FIXME: the spec documents no body; live shape
 * {"success": false, "message": "Seems like this brand is used elsewhere."}.
 */
export const ConflictResponseSchema = z.strictObject({
    success: z.boolean(),
    message: z.string(),
});

/**
 * `UnprocessableEntityResponse` — 422 validation errors.
 * FIXME: the spec documents no body; live shape is a map of
 * field name -> array of validation messages.
 */
export const UnprocessableEntityResponseSchema = z.record(
    z.string(),
    z.array(z.string())
);

// Type exports
export type UnauthorizedResponse = zOutput<typeof UnauthorizedResponseSchema>;
export type LoginErrorResponse = zOutput<typeof LoginErrorResponseSchema>;
export type ForbiddenResponse = zOutput<typeof ForbiddenResponseSchema>;
export type ItemNotFoundResponse = zOutput<typeof ItemNotFoundResponseSchema>;
export type ResourceNotFoundResponse = zOutput<
    typeof ResourceNotFoundResponseSchema
>;
export type MethodNotAllowedResponse = zOutput<
    typeof MethodNotAllowedResponseSchema
>;
export type DuplicateConflictResponse = zOutput<
    typeof DuplicateConflictResponseSchema
>;
export type ConflictResponse = zOutput<typeof ConflictResponseSchema>;
export type UnprocessableEntityResponse = zOutput<
    typeof UnprocessableEntityResponseSchema
>;

import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * User schemas, built from the OpenAPI contract
 * (https://api.practicesoftwaretesting.com/docs?api-docs.json).
 */

/**
 * `TokenResponse` — body of `POST /users/login` (and `GET /users/refresh`).
 */
export const TokenResponseSchema = z.strictObject({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
});

/**
 * `AccountRequest` — body of `POST /users/login`.
 */
export const LoginRequestSchema = z.strictObject({
    email: z.email(),
    password: z.string().min(1),
});

/**
 * Address object shared by `UserRequest`.
 */
export const UserAddressRequestSchema = z.strictObject({
    street: z.string().max(70).optional(),
    house_number: z.string().max(10).optional(),
    city: z.string().max(40).optional(),
    state: z.string().max(40).optional(),
    country: z.string().max(40).optional(),
    postal_code: z.string().max(10).optional(),
});

/**
 * `UserRequest` — body of `POST /users/register` and `PUT /users/{userId}`.
 * Required: first_name, last_name, email, password.
 */
export const UserRequestSchema = z.strictObject({
    first_name: z.string().max(40),
    last_name: z.string().max(20),
    address: UserAddressRequestSchema.optional(),
    phone: z.string().max(24).optional(),
    dob: z.iso.date().optional(),
    password: z.string().min(8),
    email: z.email().max(256),
});

/**
 * Address object of `UserResponse`.
 */
export const UserAddressResponseSchema = z.strictObject({
    street: z.string().optional(),
    house_number: z.string().nullable().optional(),
    city: z.string().optional(),
    state: z.string().nullable().optional(),
    country: z.string().optional(),
    postal_code: z.string().nullable().optional(),
});

/**
 * `UserResponse` — body of `POST /users/register`, `GET /users/me`,
 * `GET /users/{userId}` and items of `GET /users`.
 *
 * The contract lists no `required` properties for this response, so every
 * property is optional; unknown properties are still rejected.
 */
export const UserSchema = z.strictObject({
    id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    address: UserAddressResponseSchema.optional(),
    phone: z.string().nullable().optional(),
    dob: z.string().optional(),
    email: z.string().optional(),
    provider: z.string().nullable().optional(),
    totp_enabled: z.boolean().optional(),
    enabled: z.boolean().optional(),
    failed_login_attempts: z.int().nullable().optional(),
    created_at: z.string().optional(),
});

// Type exports
export type TokenResponse = zOutput<typeof TokenResponseSchema>;
export type LoginRequest = zOutput<typeof LoginRequestSchema>;
export type UserRequest = zOutput<typeof UserRequestSchema>;
export type User = zOutput<typeof UserSchema>;

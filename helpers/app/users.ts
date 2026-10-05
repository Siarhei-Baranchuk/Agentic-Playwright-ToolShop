import { expect } from '@playwright/test';
import { ApiEndpoints } from '../../enums/app/app';
import type { ApiRequestFn } from '../../fixtures/api/api-types';
import {
    FavoriteWithProductList,
    FavoriteWithProductListSchema,
} from '../../fixtures/api/schemas/app/favoriteSchema';
import {
    TotpSetupResponse,
    TotpSetupResponseSchema,
    TotpVerifyResponse,
    TotpVerifyResponseSchema,
} from '../../fixtures/api/schemas/app/totpSchema';
import {
    TokenResponse,
    TokenResponseSchema,
    User,
    UserRequest,
    UserSchema,
} from '../../fixtures/api/schemas/app/userSchema';
import { generateUserRegistration } from '../../test-data/factories/app/user.factory';
import { generateTotpCode } from '../util/totp';
import { fillPath, required } from '../util/util';

/**
 * A freshly registered user: the registration payload (including the
 * plain-text password) plus the id assigned by the API and an access token.
 */
export type RegisteredUser = UserRequest & {
    id: string;
    token: string;
};

/**
 * Registers a unique user via `POST /users/register` and logs it in.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture (or an equivalent function).
 * @param {Partial<UserRequest>} overrides - Optional registration payload overrides.
 * @returns {Promise<RegisteredUser>} The registered, logged-in user.
 */
export async function registerUser(
    apiRequest: ApiRequestFn,
    overrides?: Partial<UserRequest>
): Promise<RegisteredUser> {
    const payload = generateUserRegistration(overrides);

    const registration = await apiRequest<User>({
        method: 'POST',
        url: ApiEndpoints.REGISTER,
        body: payload,
    });
    expect(registration.status).toBe(201);
    expect(UserSchema.parse(registration.body)).toBeTruthy();

    const login = await apiRequest<TokenResponse>({
        method: 'POST',
        url: ApiEndpoints.LOGIN,
        body: { email: payload.email, password: payload.password },
    });
    expect(login.status).toBe(200);
    expect(TokenResponseSchema.parse(login.body)).toBeTruthy();

    return {
        ...payload,
        id: required(registration.body.id, 'user id'),
        token: login.body.access_token,
    };
}

/**
 * Deletes a user as the admin. Its favorites are removed first — a user
 * with favorites cannot be deleted (409). A user that owns invoices or
 * contact messages cannot be deleted at all (the API has no way to delete
 * those), so 409 is accepted and the user is left to the hourly DB reset. Uses the user's own token for
 * that, so pass a token that is still valid.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture (or an equivalent function).
 * @param {Pick<RegisteredUser, 'id' | 'token'>} user - The user to delete.
 * @returns {Promise<void>} Resolves when the user is deleted.
 */
export async function deleteUser(
    apiRequest: ApiRequestFn,
    user: Pick<RegisteredUser, 'id' | 'token'>
): Promise<void> {
    const favorites = await apiRequest<FavoriteWithProductList>({
        method: 'GET',
        url: ApiEndpoints.FAVORITES,
        headers: user.token,
    });
    // Cleanup only: a revoked token (logout / password change) answers 401,
    // and such a user has no favorites left to remove in these tests.
    if (favorites.status === 200) {
        expect(
            FavoriteWithProductListSchema.parse(favorites.body)
        ).toBeTruthy();
        for (const { id } of favorites.body) {
            await apiRequest({
                method: 'DELETE',
                url: fillPath(ApiEndpoints.FAVORITE, {
                    favoriteId: required(id, 'favorite id'),
                }),
                headers: user.token,
            });
        }
    }

    const deletion = await apiRequest({
        method: 'DELETE',
        url: fillPath(ApiEndpoints.USER, { userId: user.id }),
        headers: process.env.ADMIN_ACCESS_TOKEN,
    });
    // 409: the user owns invoices or contact messages, which the API cannot
    // delete — such users stay until the hourly reset of the demo database.
    expect([204, 409]).toContain(deletion.status);
}

/**
 * Enables TOTP for a user: `POST /totp/setup`, then `POST /totp/verify`
 * with a code generated from the returned secret.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture (or an equivalent function).
 * @param {RegisteredUser} user - The user (not a demo account — those are refused).
 * @returns {Promise<string>} The TOTP secret, to generate login codes.
 */
export async function enableTotp(
    apiRequest: ApiRequestFn,
    user: RegisteredUser
): Promise<string> {
    const setup = await apiRequest<TotpSetupResponse>({
        method: 'POST',
        url: ApiEndpoints.TOTP_SETUP,
        headers: user.token,
    });
    expect(setup.status).toBe(200);
    expect(TotpSetupResponseSchema.parse(setup.body)).toBeTruthy();
    const secret = required(setup.body.secret, 'TOTP secret');

    const verify = await apiRequest<TotpVerifyResponse>({
        method: 'POST',
        url: ApiEndpoints.TOTP_VERIFY,
        headers: user.token,
        body: { totp: generateTotpCode(secret) },
    });
    expect(verify.status).toBe(200);
    expect(TotpVerifyResponseSchema.parse(verify.body)).toBeTruthy();

    return secret;
}

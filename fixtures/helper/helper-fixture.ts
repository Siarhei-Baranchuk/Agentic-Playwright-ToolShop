import { expect, test as base } from '@playwright/test';
import { apiRequest } from '../api/plain-function';
import { ApiEndpoints } from '../../enums/app/app';
import { fillPath } from '../../helpers/util/util';
import { generateUserRegistration } from '../../test-data/factories/app/user.factory';
import {
    TokenResponse,
    TokenResponseSchema,
    User,
    UserRequest,
    UserSchema,
} from '../api/schemas/app/userSchema';

/**
 * Helper fixtures for important, recurring API-driven setup and teardown.
 *
 * IMPORTANT: Most API calls should be made directly with the `apiRequest` fixture
 * inside tests, `beforeEach`, or `afterEach`. Do NOT create a helper fixture for
 * every endpoint. Helper fixtures are reserved for critical, multi-step operations
 * that are reused across many test files and benefit from automatic lifecycle management.
 *
 * WORKFLOW:
 * Playwright's fixture lifecycle guarantees:
 *   1. Setup code (before `use()`) runs BEFORE the test
 *   2. Data passed to `use()` is available in the test via destructuring
 *   3. Teardown code (after `use()`) runs AFTER the test, even on failure
 *
 * WHEN TO CREATE A HELPER FIXTURE:
 * - The same multi-step setup/teardown is copy-pasted across 3+ test files
 * - Complex preconditions require multiple API calls in sequence
 * - Guaranteed teardown is critical (e.g., deleting test users, revoking tokens)
 *
 * WHEN TO USE `apiRequest` FIXTURE DIRECTLY INSTEAD:
 * - One-off API calls in a single test or test file
 * - API assertions (status codes, response validation)
 * - Simple setup in `beforeEach` / teardown in `afterEach`
 * - Calls specific to a single test describe block
 *
 * HOW TO ADD A NEW HELPER FIXTURE:
 * 1. Define the return type (or use a Zod schema's inferred type)
 * 2. Add the type to `HelperFixtures` below
 * 3. Implement the fixture with the setup → use() → teardown pattern
 * 4. It is automatically available in tests (already merged in test-options.ts)
 *
 * NOTE: Helper fixtures use `plain-function.ts` internally (not the `apiRequest`
 * fixture) because fixture-level code needs the raw `request` context. Tests
 * themselves should always use the `apiRequest` fixture from `test-options.ts`.
 *
 * @example
 * ```ts
 * import { expect, test } from '../../../fixtures/pom/test-options';
 *
 * test('should update the profile', { tag: '@regression' }, async ({ registeredUser, apiRequest }) => {
 *     // registeredUser was registered and logged in before this test runs
 *     const { status } = await apiRequest({
 *         method: 'GET',
 *         url: ApiEndpoints.CURRENT_USER,
 *         headers: registeredUser.token,
 *     });
 *     expect(status).toBe(200);
 *     // registeredUser is deleted automatically after this test
 * });
 * ```
 */

// ==================== Types ====================

/**
 * A freshly registered user: the registration payload (including the
 * plain-text password) plus the id assigned by the API and an access token.
 */
export type RegisteredUser = UserRequest & {
    id: string;
    token: string;
};

/**
 * Helper fixture type definitions.
 * Add new setup/teardown fixtures here as you create them.
 */
export type HelperFixtures = {
    /**
     * A new user registered via `POST /users/register` and logged in before
     * the test, deleted via `DELETE /users/{userId}` (admin) after it.
     * Use it for every test that changes user state (profile, password,
     * favorites, locking, TOTP) instead of the shared demo accounts.
     */
    registeredUser: RegisteredUser;
};

// ==================== Fixtures ====================

export const test = base.extend<HelperFixtures>({
    /**
     * Registers and logs in a unique user, yields it, then deletes it.
     *
     * @param {APIRequestContext} request - Playwright request context (injected automatically).
     * @param {function} use - Playwright fixture lifecycle callback.
     */
    registeredUser: async ({ request }, use) => {
        // ── SETUP: Runs before the test ──────────────────────────────
        const payload = generateUserRegistration();

        const registration = await apiRequest({
            request,
            method: 'POST',
            url: ApiEndpoints.REGISTER,
            body: payload,
        });
        expect(registration.status).toBe(201);
        expect(UserSchema.parse(registration.body)).toBeTruthy();
        const { id } = registration.body as User;
        if (!id) throw new Error('POST /users/register returned no user id');

        const login = await apiRequest({
            request,
            method: 'POST',
            url: ApiEndpoints.LOGIN,
            body: { email: payload.email, password: payload.password },
        });
        expect(login.status).toBe(200);
        expect(TokenResponseSchema.parse(login.body)).toBeTruthy();

        // ── YIELD: Passes data to the test ───────────────────────────
        await use({
            ...payload,
            id,
            token: (login.body as TokenResponse).access_token,
        });

        // ── TEARDOWN: Runs after the test (even on failure) ──────────
        const deletion = await apiRequest({
            request,
            method: 'DELETE',
            url: fillPath(ApiEndpoints.USER, { userId: id }),
            headers: process.env.ADMIN_ACCESS_TOKEN,
        });
        expect(deletion.status).toBe(204);
    },
});

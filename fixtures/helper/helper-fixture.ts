import { test as base } from '@playwright/test';
import { apiRequest } from '../api/plain-function';
import type {
    ApiRequestFn,
    ApiRequestParams,
    ApiRequestResponse,
} from '../api/api-types';
import {
    deleteUser,
    registerUser,
    type RegisteredUser,
} from '../../helpers/app/users';
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

export type { RegisteredUser };

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
     * Registers and logs in a unique user, yields it, then deletes it
     * (its favorites first, so a test that failed half-way leaves nothing behind).
     *
     * @param {APIRequestContext} request - Playwright request context (injected automatically).
     * @param {function} use - Playwright fixture lifecycle callback.
     */
    registeredUser: async ({ request }, use) => {
        const api: ApiRequestFn = async <T = unknown>(
            params: ApiRequestParams
        ): Promise<ApiRequestResponse<T>> => {
            const response = await apiRequest({ request, ...params });
            return { ...response, body: response.body as T };
        };

        // ── SETUP: Runs before the test ──────────────────────────────
        const user = await registerUser(api);

        // ── YIELD: Passes data to the test ───────────────────────────
        await use(user);

        // ── TEARDOWN: Runs after the test (even on failure) ──────────
        await deleteUser(api, user);
    },
});

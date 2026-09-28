import { expect, request, type Page } from '@playwright/test';
import { ApiEndpoints, StorageStatePaths } from '../../enums/app/app';
import { PageManager } from '../../pages/page-manager';
import { apiRequest } from '../../fixtures/api/plain-function';
import {
    TokenResponse,
    TokenResponseSchema,
} from '../../fixtures/api/schemas/app/userSchema';

/**
 * Logs in through the UI with the given credentials and saves the browser
 * storage state (cookies and localStorage) to `path`, so subsequent tests
 * start already authenticated.
 *
 * Takes the `page` fixture from the setup test, so the project's `use`
 * settings (viewport, testIdAttribute) apply and a failed login is captured
 * by trace / screenshot / video like any other test.
 *
 * @param {Page} page - The Playwright page fixture from the setup test.
 * @param {string} email - Account email.
 * @param {string} password - Account password.
 * @param {StorageStatePaths} path - Where to save the storage state.
 * @returns {Promise<void>} Resolves when storage state is saved.
 */
async function saveStorageState(
    page: Page,
    email: string,
    password: string,
    path: StorageStatePaths
): Promise<void> {
    const pm = new PageManager(page);

    await pm.loginPage.open();
    await pm.loginPage.login(email, password);
    await expect(pm.navComponent.userMenu).toBeVisible();

    await page.context().storageState({ path });
}

/**
 * Saves the storage state of the customer account (`APP_EMAIL`), used by
 * the `chromium` project.
 *
 * @param {Page} page - The Playwright page fixture from the setup test.
 * @returns {Promise<void>} Resolves when storage state is saved.
 *
 * @example
 * ```ts
 * // In auth.setup.ts
 * test('setup authentication', async ({ page }) => {
 *   await createAppStorageState(page);
 * });
 * ```
 */
export async function createAppStorageState(page: Page): Promise<void> {
    await saveStorageState(
        page,
        process.env.APP_EMAIL!,
        process.env.APP_PASSWORD!,
        StorageStatePaths.APP
    );
}

/**
 * Saves the storage state of the admin account (`ADMIN_EMAIL`), used by
 * the `chromium-admin` project.
 *
 * @param {Page} page - The Playwright page fixture from the setup test.
 * @returns {Promise<void>} Resolves when storage state is saved.
 */
export async function createAdminStorageState(page: Page): Promise<void> {
    await saveStorageState(
        page,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
        StorageStatePaths.ADMIN
    );
}

/**
 * Logs in via `POST /users/login` and returns the access token.
 *
 * @param {string} email - Account email.
 * @param {string} password - Account password.
 * @returns {Promise<string>} The access token.
 *
 * @example
 * ```ts
 * const token = await loginViaApi(user.email, user.password);
 * ```
 */
export async function loginViaApi(
    email: string,
    password: string
): Promise<string> {
    const context = await request.newContext();

    try {
        const { status, body } = await apiRequest({
            request: context,
            method: 'POST',
            url: ApiEndpoints.LOGIN,
            body: { email, password },
        });

        expect(
            status,
            `API login failed for ${email} — check API_URL and the credentials in env/.env.dev`
        ).toBe(200);
        expect(TokenResponseSchema.parse(body)).toBeTruthy();

        return (body as TokenResponse).access_token;
    } finally {
        await context.dispose();
    }
}

/**
 * Authenticates the customer account via API and publishes the access
 * token as `process.env.ACCESS_TOKEN`.
 *
 * Called from Playwright's `globalSetup` (see `helpers/app/global-setup.ts`),
 * which runs in the main process before any worker starts — environment
 * variables set there are inherited by every worker, so the token is
 * available in all projects, including `api`.
 *
 * @returns {Promise<void>} Resolves when the token is stored.
 *
 * @example
 * ```ts
 * // In API tests
 * const { status, body } = await apiRequest<User>({
 *   method: 'GET',
 *   url: ApiEndpoints.CURRENT_USER,
 *   headers: process.env.ACCESS_TOKEN,
 * });
 * ```
 */
export async function setUserAccessToken(): Promise<void> {
    process.env.ACCESS_TOKEN = await loginViaApi(
        process.env.APP_EMAIL!,
        process.env.APP_PASSWORD!
    );
}

/**
 * Authenticates the admin account via API and publishes the access token
 * as `process.env.ADMIN_ACCESS_TOKEN` (admin-only endpoints, teardown of
 * test users). Called from Playwright's `globalSetup`.
 *
 * @returns {Promise<void>} Resolves when the token is stored.
 */
export async function setAdminAccessToken(): Promise<void> {
    process.env.ADMIN_ACCESS_TOKEN = await loginViaApi(
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!
    );
}

import { test as base } from '@playwright/test';
import { PageManager } from '../../pages/page-manager';

/**
 * Framework fixtures for page objects.
 *
 * All page objects are reached through a single `pm` fixture (PageManager).
 * New pages are registered in `pages/page-manager.ts` — not here.
 */
export type FrameworkFixtures = {
    /** Page manager: access to every page object and site-wide component */
    pm: PageManager;
    resetStorageState: () => Promise<void>;
};

/**
 * Extended test with the page manager fixture.
 *
 * @example
 * ```ts
 * import { expect, test } from '../fixtures/pom/test-options';
 *
 * test('example test', async ({ pm }) => {
 *   await pm.homePage.open();
 *   await expect(pm.navComponent.userMenu).toBeVisible();
 * });
 * ```
 */
export const test = base.extend<FrameworkFixtures>({
    pm: async ({ page }, use) => {
        await use(new PageManager(page));
    },

    resetStorageState: async ({ context }, use) => {
        await use(async () => {
            await context.clearCookies();
            await context.clearPermissions();
        });
    },
});

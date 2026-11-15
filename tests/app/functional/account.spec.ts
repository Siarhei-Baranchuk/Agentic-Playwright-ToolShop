import { AccountMenuItems, AccountTiles } from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';
import { startBrowserSession } from '../../../helpers/app/createStorageState';
import type { PageManager } from '../../../pages/page-manager';
import type { Locator } from '@playwright/test';

/** Each overview tile with the heading of the page it opens */
const TILES = [
    {
        tile: AccountTiles.FAVORITES,
        heading: (pm: PageManager): Locator => pm.favoritesPage.heading,
    },
    {
        tile: AccountTiles.PROFILE,
        heading: (pm: PageManager): Locator => pm.profilePage.heading,
    },
    {
        tile: AccountTiles.INVOICES,
        heading: (pm: PageManager): Locator => pm.invoicesPage.heading,
    },
    {
        tile: AccountTiles.MESSAGES,
        heading: (pm: PageManager): Locator => pm.messagesPage.heading,
    },
] as const;

/** Each user-menu entry with the heading of the page it opens */
const MENU_ITEMS = [
    {
        item: AccountMenuItems.MY_ACCOUNT,
        heading: (pm: PageManager): Locator => pm.accountPage.heading,
    },
    {
        item: AccountMenuItems.MY_FAVORITES,
        heading: (pm: PageManager): Locator => pm.favoritesPage.heading,
    },
    {
        item: AccountMenuItems.MY_PROFILE,
        heading: (pm: PageManager): Locator => pm.profilePage.heading,
    },
    {
        item: AccountMenuItems.MY_INVOICES,
        heading: (pm: PageManager): Locator => pm.invoicesPage.heading,
    },
    {
        item: AccountMenuItems.MY_MESSAGES,
        heading: (pm: PageManager): Locator => pm.messagesPage.heading,
    },
] as const;

test.describe('account overview', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page, pm, registeredUser }) => {
        await startBrowserSession(page, registeredUser.token);
        await pm.accountPage.open();
    });

    test(
        'should greet the signed-in customer on the account page',
        { tag: '@smoke' },
        async ({ pm, registeredUser }) => {
            await test.step('Preconditions: the account page is open', async () => {
                await expect(pm.accountPage.heading).toBeVisible();
            });

            await test.step('Steps: open the user menu', async () => {
                await pm.navComponent.openUserMenu();
            });

            await test.step("Expected: the menu shows the customer's name and the sign-out entry", async () => {
                await expect(pm.navComponent.userMenu).toContainText(
                    `${registeredUser.first_name} ${registeredUser.last_name}`
                );
                await expect(pm.navComponent.signOutLink).toBeVisible();
            });
        }
    );

    for (const { tile, heading } of TILES) {
        test(
            `should open the section of the "${tile}" tile`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the account page is open', async () => {
                    await expect(pm.accountPage.heading).toBeVisible();
                });

                await test.step('Steps: click the tile', async () => {
                    await pm.accountPage.openTile(tile);
                });

                await test.step('Expected: the section page is shown', async () => {
                    await expect(heading(pm)).toBeVisible();
                });
            }
        );
    }

    for (const { item, heading } of MENU_ITEMS) {
        test(
            `should open "${item}" from the user menu`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the account page is open', async () => {
                    await expect(pm.navComponent.userMenu).toBeVisible();
                });

                await test.step(`Steps: choose "${item}" in the user menu`, async () => {
                    await pm.navComponent.openAccountMenuItem(item);
                });

                await test.step('Expected: the section page is shown', async () => {
                    await expect(heading(pm)).toBeVisible();
                });
            }
        );
    }
});

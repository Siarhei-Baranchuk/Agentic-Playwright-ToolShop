import { Locator, Page } from '@playwright/test';
import { AccountTiles, AppRoutes, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the account overview (`/account`) — the landing page
 * after a customer login, with shortcut tiles to the account sections.
 *
 * Accessed in tests through the page manager: `pm.accountPage`.
 */
export class AccountPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.MY_ACCOUNT,
        });
    }

    // The tiles are icon links without an accessible name
    tile(tile: AccountTiles): Locator {
        return this.page.getByTestId(tile);
    }

    // ==================== Actions ====================

    /**
     * Opens the account overview.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.ACCOUNT}`);
    }

    /**
     * Opens an account section through its overview tile.
     *
     * @param {AccountTiles} tile - The tile to click.
     * @returns {Promise<void>} Resolves when the tile is clicked.
     */
    async openTile(tile: AccountTiles): Promise<void> {
        await this.tile(tile).click();
    }
}

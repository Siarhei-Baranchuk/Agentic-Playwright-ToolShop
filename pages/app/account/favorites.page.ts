import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the favorites list (`/account/favorites`).
 *
 * Accessed in tests through the page manager: `pm.favoritesPage`.
 */
export class FavoritesPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.FAVORITES,
        });
    }

    // Each card carries a `favorite-<id>` test id; there is no list role
    get cards(): Locator {
        return this.page.getByTestId(/^favorite-/);
    }

    card(productName: string): Locator {
        return this.cards.filter({
            has: this.page.getByRole('heading', {
                name: productName,
                exact: true,
            }),
        });
    }

    // The delete button is an icon without an accessible name
    deleteButton(productName: string): Locator {
        return this.card(productName).getByTestId('delete');
    }

    // ==================== Feedback Locators ====================

    get emptyMessage(): Locator {
        return this.page.getByText(Messages.NO_FAVORITES);
    }

    // ==================== Actions ====================

    /**
     * Opens the favorites page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${AppRoutes.ACCOUNT_FAVORITES}`
        );
    }

    /**
     * Removes a product from the favorites.
     *
     * @param {string} productName - The product name shown on the card.
     * @returns {Promise<void>} Resolves when the delete button is clicked.
     */
    async remove(productName: string): Promise<void> {
        await this.deleteButton(productName).click();
    }
}

import { Locator, Page } from '@playwright/test';
import { AppRoutes, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the rentals overview (`/rentals`). Rental cards are not
 * links — a card opens its product through a click handler on the name.
 *
 * Accessed in tests through the page manager: `pm.rentalsPage`.
 */
export class RentalsPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            level: 1,
            name: PageHeadings.RENTALS,
        });
    }

    get rentalNames(): Locator {
        return this.page.getByRole('heading', { level: 5, name: /\S/ });
    }

    rentalName(name: string): Locator {
        return this.page.getByRole('heading', { level: 5, name, exact: true });
    }

    // ==================== Actions ====================

    /**
     * Opens the rentals overview.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.RENTALS}`);
    }

    /**
     * Opens a rental product.
     *
     * @param {string} name - The product name.
     * @returns {Promise<void>} Resolves when the card is clicked.
     */
    async openRental(name: string): Promise<void> {
        await this.rentalName(name).click();
    }
}

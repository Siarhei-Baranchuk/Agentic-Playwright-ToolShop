import { Locator, Page } from '@playwright/test';

/**
 * Component Object for the comparison bar that appears on the catalog once
 * products are selected for comparison.
 */
export class ComparisonBarComponent {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get selectedCount(): Locator {
        return this.page.getByText(/\d+ product\(s\) selected/);
    }

    get clearAllButton(): Locator {
        return this.page.getByRole('button', { name: 'Clear All' });
    }

    get compareNowLink(): Locator {
        return this.page.getByRole('link', { name: 'Compare Now' });
    }

    // ==================== Actions ====================

    /**
     * Opens the comparison page.
     *
     * @returns {Promise<void>} Resolves when the link is clicked.
     */
    async compareNow(): Promise<void> {
        await this.compareNowLink.click();
    }

    /**
     * Removes every product from the comparison.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async clearAll(): Promise<void> {
        await this.clearAllButton.click();
    }
}

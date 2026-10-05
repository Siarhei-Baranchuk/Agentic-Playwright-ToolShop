import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the product comparison (`/comparison`).
 *
 * Accessed in tests through the page manager: `pm.comparisonPage`.
 */
export class ComparisonPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.COMPARISON,
        });
    }

    get table(): Locator {
        return this.page.getByRole('table', { name: PageHeadings.COMPARISON });
    }

    get rowHeaders(): Locator {
        return this.table.getByRole('rowheader');
    }

    get showDifferencesCheckbox(): Locator {
        return this.page.getByRole('checkbox', {
            name: 'Show differences only',
        });
    }

    get clearAllButton(): Locator {
        return this.page.getByRole('button', { name: 'Clear All' });
    }

    get browseProductsLink(): Locator {
        return this.page.getByRole('link', { name: 'Browse Products' });
    }

    removeButton(productName: string): Locator {
        return this.page.getByRole('button', {
            name: `Remove ${productName} from comparison`,
        });
    }

    // ==================== Feedback Locators ====================

    get emptyMessage(): Locator {
        return this.page.getByText(Messages.COMPARISON_EMPTY);
    }

    // ==================== Actions ====================

    /**
     * Opens the comparison page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.COMPARISON}`);
    }

    /**
     * Removes one product from the comparison.
     *
     * @param {string} productName - The product name.
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async remove(productName: string): Promise<void> {
        await this.removeButton(productName).click();
    }
}

import { Locator, Page } from '@playwright/test';
import { Messages } from '../../enums/app/app';

/**
 * Component Object for the product grid with its pagination (home and
 * category pages). A product card is a link that contains the product name
 * as a level-5 heading; empty headings are loading placeholders.
 */
export class ProductGridComponent {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get productNames(): Locator {
        return this.page.getByRole('heading', { level: 5, name: /\S/ });
    }

    get productCards(): Locator {
        return this.page.getByRole('link').filter({ has: this.productNames });
    }

    get productPrices(): Locator {
        return this.productCards.getByTestId('product-price');
    }

    get ecoBadges(): Locator {
        return this.productCards.getByTestId('eco-badge');
    }

    get outOfStockCards(): Locator {
        return this.productCards.filter({ hasText: Messages.OUT_OF_STOCK });
    }

    get nextPageButton(): Locator {
        return this.page.getByRole('button', { name: 'Next' });
    }

    productCard(name: string): Locator {
        return this.productCards.filter({
            has: this.page.getByRole('heading', {
                level: 5,
                name,
                exact: true,
            }),
        });
    }

    compareButton(name: string): Locator {
        return this.productCard(name).getByRole('button', { name: 'Compare' });
    }

    paginationButton(pageNumber: number): Locator {
        return this.page.getByRole('button', { name: `Page-${pageNumber}` });
    }

    // ==================== Actions ====================

    /**
     * Returns the product names currently shown. Wait for the grid in the
     * test first (e.g. `await expect(grid.productNames).not.toHaveCount(0)`).
     *
     * @returns {Promise<string[]>} The names, in display order.
     */
    async getProductNames(): Promise<string[]> {
        return (await this.productNames.allInnerTexts()).map((name) =>
            name.trim()
        );
    }

    /**
     * Returns the prices currently shown. Wait for the grid in the test first.
     *
     * @returns {Promise<number[]>} The prices, in display order.
     */
    async getPrices(): Promise<number[]> {
        return (await this.productPrices.allInnerTexts()).map((price) =>
            Number(price.replace(/[^0-9.]/g, ''))
        );
    }

    /**
     * Opens a product's detail page from its card.
     *
     * @param {string} name - The product name.
     * @returns {Promise<void>} Resolves when the card is clicked.
     */
    async openProduct(name: string): Promise<void> {
        await this.productCard(name).click();
    }

    /**
     * Adds a product to the comparison from its card.
     *
     * @param {string} name - The product name.
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async compare(name: string): Promise<void> {
        await this.compareButton(name).click();
    }

    /**
     * Goes to a page of the pagination.
     *
     * @param {number} pageNumber - The page number.
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async goToPage(pageNumber: number): Promise<void> {
        await this.paginationButton(pageNumber).click();
    }
}

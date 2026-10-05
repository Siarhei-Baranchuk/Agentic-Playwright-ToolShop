import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';
import { fillPath } from '../../../helpers/util/util';

/**
 * Page Object for a product detail page (`/product/:id`), regular or rental.
 *
 * Accessed in tests through the page manager: `pm.productDetailPage`.
 */
export class ProductDetailPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get name(): Locator {
        return this.page.getByRole('heading', { level: 1 });
    }

    get price(): Locator {
        return this.page.getByTestId('unit-price');
    }

    get description(): Locator {
        return this.page.getByTestId('product-description');
    }

    get quantityInput(): Locator {
        return this.page.getByRole('spinbutton', { name: 'Quantity' });
    }

    get increaseQuantityButton(): Locator {
        return this.page.getByRole('button', { name: 'Increase quantity' });
    }

    get decreaseQuantityButton(): Locator {
        return this.page.getByRole('button', { name: 'Decrease quantity' });
    }

    get addToCartButton(): Locator {
        return this.page.getByRole('button', { name: 'Add to cart' });
    }

    get addToFavouritesButton(): Locator {
        return this.page.getByRole('button', { name: 'Add to favourites' });
    }

    get compareButton(): Locator {
        return this.page.getByRole('button', { name: 'Compare' });
    }

    get specificationsHeading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.SPECIFICATIONS,
        });
    }

    get specificationRows(): Locator {
        return this.page.getByRole('table').getByRole('row');
    }

    get relatedProductsHeading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.RELATED_PRODUCTS,
        });
    }

    get relatedProductLinks(): Locator {
        return this.page.getByRole('link').filter({
            has: this.page.getByRole('heading', { level: 5, name: /\S/ }),
        });
    }

    get durationSlider(): Locator {
        return this.page.getByRole('slider', { name: 'ngx-slider' });
    }

    get duration(): Locator {
        return this.page.getByText(/Duration \(\d+ hour\(s\)\)/);
    }

    get totalPrice(): Locator {
        return this.page.getByText(/\(Total \$[\d.]+\)/);
    }

    get categoryBadge(): Locator {
        return this.page.getByLabel('category', { exact: true });
    }

    get brandBadge(): Locator {
        return this.page.getByLabel('brand', { exact: true });
    }

    relatedProductLink(name: string): Locator {
        return this.relatedProductLinks.filter({
            has: this.page.getByRole('heading', { name, exact: true }),
        });
    }

    // ==================== Feedback Locators ====================

    get addedToCartMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.PRODUCT_ADDED_TO_CART });
    }

    get favouriteUnauthorizedMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.FAVORITE_UNAUTHORIZED });
    }

    get outOfStockLabel(): Locator {
        return this.page.getByText(Messages.OUT_OF_STOCK, { exact: true });
    }

    // ==================== Actions ====================

    /**
     * Opens a product detail page.
     *
     * @param {string} id - The product id.
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(id: string): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${fillPath(AppRoutes.PRODUCT, { id })}`
        );
    }

    /**
     * Types a quantity into the quantity field.
     *
     * @param {number} quantity - The quantity to enter.
     * @returns {Promise<void>} Resolves when the value is entered and the field is left.
     */
    async setQuantity(quantity: number): Promise<void> {
        await this.quantityInput.fill(String(quantity));
        await this.quantityInput.blur();
    }

    /**
     * Adds the product to the cart.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async addToCart(): Promise<void> {
        await this.addToCartButton.click();
    }

    /**
     * Adds the product to the favourites.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async addToFavourites(): Promise<void> {
        await this.addToFavouritesButton.click();
    }

    /**
     * Sets the rental duration with the slider (rental products only).
     *
     * @param {number} hours - The duration in hours (1–10).
     * @returns {Promise<void>} Resolves when the slider reaches the value.
     */
    async setDuration(hours: number): Promise<void> {
        const current = Number(
            await this.durationSlider.getAttribute('aria-valuenow')
        );
        for (let step = current; step < hours; step++) {
            await this.durationSlider.press('ArrowRight');
        }
    }
}

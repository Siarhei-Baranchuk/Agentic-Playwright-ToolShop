import { Locator, Page } from '@playwright/test';
import { Messages, SortOptions } from '../../enums/app/app';

/**
 * Component Object for the catalog sidebar: sorting, price range, search
 * and the category / brand / eco filters. Shown on the home and category
 * pages, composed into those page objects.
 */
export class ProductFiltersComponent {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get sortSelect(): Locator {
        return this.page.getByRole('combobox', { name: 'sort' });
    }

    get minPriceSlider(): Locator {
        return this.page.getByRole('slider', {
            name: 'ngx-slider',
            exact: true,
        });
    }

    get maxPriceSlider(): Locator {
        return this.page.getByRole('slider', { name: 'ngx-slider-max' });
    }

    get searchInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Search' });
    }

    get searchButton(): Locator {
        return this.page.getByRole('button', { name: 'Search', exact: true });
    }

    get resetSearchButton(): Locator {
        return this.page.getByRole('button', { name: 'X', exact: true });
    }

    get categoriesHeading(): Locator {
        return this.page.getByRole('heading', { name: 'By category:' });
    }

    get brandsHeading(): Locator {
        return this.page.getByRole('heading', { name: 'By brand:' });
    }

    get brandsGroup(): Locator {
        return this.page.getByRole('group', { name: 'Brands' });
    }

    get ecoFriendlyCheckbox(): Locator {
        return this.page.getByRole('checkbox', {
            name: 'Show only eco-friendly products',
        });
    }

    categoryCheckbox(name: string): Locator {
        return this.page.getByRole('checkbox', { name, exact: true });
    }

    brandCheckbox(name: string): Locator {
        return this.brandsGroup.getByRole('checkbox', { name, exact: true });
    }

    // ==================== Feedback Locators ====================

    get searchCaption(): Locator {
        return this.page.getByText(Messages.SEARCHED_FOR);
    }

    get noProductsFound(): Locator {
        return this.page.getByText(Messages.NO_PRODUCTS_FOUND);
    }

    // ==================== Actions ====================

    /**
     * Searches the catalog for a term.
     *
     * @param {string} term - The search term.
     * @returns {Promise<void>} Resolves when the search is submitted.
     */
    async search(term: string): Promise<void> {
        await this.searchInput.fill(term);
        await this.searchButton.click();
    }

    /**
     * Clears the search with the "X" button.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async resetSearch(): Promise<void> {
        await this.resetSearchButton.click();
    }

    /**
     * Sorts the catalog.
     *
     * @param {SortOptions} option - The visible sort option.
     * @returns {Promise<void>} Resolves when the option is selected.
     */
    async sortBy(option: SortOptions): Promise<void> {
        await this.sortSelect.selectOption({ label: option });
    }

    /**
     * Ticks a category (or sub-category) checkbox.
     *
     * @param {string} name - The category name.
     * @returns {Promise<void>} Resolves when the checkbox is checked.
     */
    async filterByCategory(name: string): Promise<void> {
        await this.categoryCheckbox(name).check();
    }

    /**
     * Ticks a brand checkbox.
     *
     * @param {string} name - The brand name.
     * @returns {Promise<void>} Resolves when the checkbox is checked.
     */
    async filterByBrand(name: string): Promise<void> {
        await this.brandCheckbox(name).check();
    }

    /**
     * Shows only eco-friendly products.
     *
     * @returns {Promise<void>} Resolves when the checkbox is checked.
     */
    async showEcoFriendlyOnly(): Promise<void> {
        await this.ecoFriendlyCheckbox.check();
    }

    /**
     * Moves the upper handle of the price slider down to `maxPrice` with the
     * keyboard (one arrow press = one dollar).
     *
     * @param {number} maxPrice - The new upper bound.
     * @returns {Promise<void>} Resolves when the handle reaches the value.
     */
    async setMaxPrice(maxPrice: number): Promise<void> {
        const current = Number(
            await this.maxPriceSlider.getAttribute('aria-valuenow')
        );
        for (let step = current; step > maxPrice; step--) {
            await this.maxPriceSlider.press('ArrowLeft');
        }
    }
}

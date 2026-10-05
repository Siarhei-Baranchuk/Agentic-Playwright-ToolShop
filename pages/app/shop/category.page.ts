import { Locator, Page } from '@playwright/test';
import { AppRoutes, PageHeadings } from '../../../enums/app/app';
import { fillPath } from '../../../helpers/util/util';
import { ProductFiltersComponent } from '../../components/product-filters.component';
import { ProductGridComponent } from '../../components/product-grid.component';

/**
 * Page Object for a category page (`/category/:slug`).
 *
 * Accessed in tests through the page manager: `pm.categoryPage`.
 */
export class CategoryPage {
    /** Sorting and filters in the sidebar */
    readonly filters: ProductFiltersComponent;
    /** Product cards and pagination */
    readonly grid: ProductGridComponent;

    constructor(private readonly page: Page) {
        this.filters = new ProductFiltersComponent(page);
        this.grid = new ProductGridComponent(page);
    }

    // ==================== Locators ====================

    heading(categoryName: string): Locator {
        return this.page.getByRole('heading', {
            level: 2,
            name: `${PageHeadings.CATEGORY_PREFIX} ${categoryName}`,
        });
    }

    // ==================== Actions ====================

    /**
     * Opens a category page.
     *
     * @param {string} slug - The category slug, e.g. `hand-tools`.
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(slug: string): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${fillPath(AppRoutes.CATEGORY, { slug })}`
        );
    }
}

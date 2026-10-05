import { Page } from '@playwright/test';
import { AppRoutes } from '../../../enums/app/app';
import { ComparisonBarComponent } from '../../components/comparison-bar.component';
import { ProductFiltersComponent } from '../../components/product-filters.component';
import { ProductGridComponent } from '../../components/product-grid.component';

/**
 * Page Object for the home page — the product catalog.
 *
 * Accessed in tests through the page manager: `pm.homePage`.
 */
export class HomePage {
    /** Sorting, price range, search and filters in the sidebar */
    readonly filters: ProductFiltersComponent;
    /** Product cards and pagination */
    readonly grid: ProductGridComponent;
    /** Bar shown once products are selected for comparison */
    readonly comparisonBar: ComparisonBarComponent;

    constructor(private readonly page: Page) {
        this.filters = new ProductFiltersComponent(page);
        this.grid = new ProductGridComponent(page);
        this.comparisonBar = new ComparisonBarComponent(page);
    }

    // ==================== Actions ====================

    /**
     * Opens the home page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.HOME}`);
    }
}

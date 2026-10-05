import { Page } from '@playwright/test';
import { CategoryPage } from './app/shop/category.page';
import { ComparisonPage } from './app/shop/comparison.page';
import { ContactPage } from './app/shop/contact.page';
import { HomePage } from './app/shop/home.page';
import { PrivacyPage } from './app/shop/privacy.page';
import { ProductDetailPage } from './app/shop/product-detail.page';
import { RentalsPage } from './app/shop/rentals.page';
import { LoginPage } from './app/login.page';
import { NavigationComponent } from './components/navigation.component';

/**
 * Page Manager — the single entry point to every page object and
 * site-wide component.
 *
 * Tests receive it through the `pm` fixture and reach pages as properties:
 *
 * ```ts
 * test('should login', async ({ pm }) => {
 *     await pm.loginPage.open();
 *     await pm.loginPage.login(email, password);
 *     await expect(pm.navComponent.userMenu).toBeVisible();
 * });
 * ```
 *
 * All page objects are created in the constructor, once per test, and share
 * the same Playwright `page`. Creating them is essentially free: a page object
 * only stores `page` — its locators are getters that touch the browser only
 * when a test calls an action or assertion on them.
 *
 * To add a page: create it under `pages/{area}/`, add a `readonly` field and
 * one line in the constructor below. Nothing else needs to change — the `pm`
 * fixture already exposes this class.
 */
export class PageManager {
    // ==================== Pages ====================

    readonly homePage: HomePage;
    readonly categoryPage: CategoryPage;
    readonly productDetailPage: ProductDetailPage;
    readonly rentalsPage: RentalsPage;
    readonly comparisonPage: ComparisonPage;
    readonly contactPage: ContactPage;
    readonly privacyPage: PrivacyPage;
    readonly loginPage: LoginPage;

    // ==================== Site-wide Components ====================

    readonly navComponent: NavigationComponent;

    constructor(page: Page) {
        this.homePage = new HomePage(page);
        this.categoryPage = new CategoryPage(page);
        this.productDetailPage = new ProductDetailPage(page);
        this.rentalsPage = new RentalsPage(page);
        this.comparisonPage = new ComparisonPage(page);
        this.contactPage = new ContactPage(page);
        this.privacyPage = new PrivacyPage(page);
        this.loginPage = new LoginPage(page);

        this.navComponent = new NavigationComponent(page);
    }
}

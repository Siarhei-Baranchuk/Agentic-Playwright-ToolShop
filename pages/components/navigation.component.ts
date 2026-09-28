import { Locator, Page } from '@playwright/test';

/**
 * Component Object for the main navigation bar.
 * Demonstrates the component pattern for reusable UI fragments.
 *
 * Components are smaller, reusable pieces of UI (headers, footers, sidebars,
 * modals). Two ways to use them:
 * - **Site-wide** components (like this navigation bar) are exposed by the
 *   page manager: `pm.navComponent`.
 * - **Page-specific** components are composed into their page object as a
 *   `readonly` field (e.g. `readonly filtersComponent: FiltersComponent`).
 *
 * @example
 * ```ts
 * // In tests
 * await pm.navComponent.clickHome();
 * await expect(pm.navComponent.userMenu).toBeVisible();
 * ```
 */
export class NavigationComponent {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get container(): Locator {
        return this.page.getByRole('navigation');
    }

    get homeLink(): Locator {
        return this.page.getByRole('link', { name: 'Home' });
    }

    get contactLink(): Locator {
        return this.page.getByRole('link', { name: 'Contact' });
    }

    get categoriesButton(): Locator {
        return this.page.getByRole('button', { name: 'Categories' });
    }

    get signInLink(): Locator {
        return this.page.getByRole('link', { name: 'Sign in' });
    }

    // Logged-in user dropdown toggle; shows the user's name
    get userMenu(): Locator {
        return this.page.getByTestId('nav-menu');
    }

    // Sign-out item inside the user dropdown (hidden until the menu opens)
    get signOutLink(): Locator {
        return this.page.getByTestId('nav-sign-out');
    }

    // ==================== Actions ====================

    /**
     * Navigates to the home page via the navigation link.
     *
     * @returns {Promise<void>}
     */
    async clickHome(): Promise<void> {
        await this.homeLink.click();
    }

    /**
     * Navigates to the contact page via the navigation link.
     *
     * @returns {Promise<void>}
     */
    async clickContact(): Promise<void> {
        await this.contactLink.click();
    }

    /**
     * Opens the product categories dropdown.
     *
     * @returns {Promise<void>}
     */
    async openCategories(): Promise<void> {
        await this.categoriesButton.click();
    }

    /**
     * Opens the logged-in user's dropdown menu.
     *
     * @returns {Promise<void>}
     */
    async openUserMenu(): Promise<void> {
        await this.userMenu.click();
    }

    /**
     * Signs out by opening the user menu and clicking the sign-out item.
     *
     * @returns {Promise<void>}
     */
    async signOut(): Promise<void> {
        await this.openUserMenu();
        await this.signOutLink.click();
    }
}

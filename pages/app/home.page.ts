import { Page } from '@playwright/test';

/**
 * Page Object for the application home page.
 *
 * Add locators here only after exploring the live page with `playwright-cli`.
 * Site-wide elements (header / navigation) live in `NavigationComponent`,
 * available as `pm.navComponent`.
 *
 * Accessed in tests through the page manager: `pm.homePage`.
 */
export class HomePage {
    constructor(private readonly page: Page) {}

    // ==================== Actions ====================

    /**
     * Navigates to the application home page using the configured APP_URL.
     * Waits for the page to reach DOM content loaded state.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(process.env.APP_URL!, {
            waitUntil: 'domcontentloaded',
        });
    }
}

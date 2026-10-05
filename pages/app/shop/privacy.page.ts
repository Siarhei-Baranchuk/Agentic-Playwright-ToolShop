import { Locator, Page } from '@playwright/test';
import { AppRoutes, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the privacy policy (`/privacy`).
 *
 * Accessed in tests through the page manager: `pm.privacyPage`.
 */
export class PrivacyPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            level: 1,
            name: PageHeadings.PRIVACY,
        });
    }

    // ==================== Actions ====================

    /**
     * Opens the privacy policy.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.PRIVACY}`);
    }
}

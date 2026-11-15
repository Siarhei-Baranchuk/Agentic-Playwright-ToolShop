import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the forgot-password form (`/auth/forgot-password`).
 *
 * Accessed in tests through the page manager: `pm.forgotPasswordPage`.
 */
export class ForgotPasswordPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.FORGOT_PASSWORD,
        });
    }

    get emailInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Email address *' });
    }

    get submitButton(): Locator {
        return this.page.getByRole('button', { name: 'Set New Password' });
    }

    // ==================== Feedback Locators ====================

    get successMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.PASSWORD_UPDATED });
    }

    get emailRequiredError(): Locator {
        return this.page.getByText(Messages.EMAIL_REQUIRED);
    }

    get emailFormatError(): Locator {
        return this.page.getByText(Messages.EMAIL_FORMAT_INVALID);
    }

    get unknownEmailError(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.FORGOT_PASSWORD_UNKNOWN_EMAIL });
    }

    // ==================== Actions ====================

    /**
     * Opens the forgot-password page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${AppRoutes.FORGOT_PASSWORD}`
        );
    }

    /**
     * Requests a new password for an email.
     *
     * @param {string} email - The account email (may be empty).
     * @returns {Promise<void>} Resolves when the form is submitted.
     */
    async requestNewPassword(email: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.submitButton.click();
    }
}

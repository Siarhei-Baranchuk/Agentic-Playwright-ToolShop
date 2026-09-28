import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages } from '../../enums/app/app';

/**
 * Page Object for the login page.
 *
 * Demonstrates the recommended locator priority:
 * 1. getByRole() - Accessibility-based (most recommended)
 * 2. getByLabel() - Form labels
 * 3. getByPlaceholder() - Placeholder text
 * 4. getByText() - Text content
 * 5. getByTestId() - Test IDs (fallback when semantic locators aren't possible)
 *
 * Accessed in tests through the page manager: `pm.loginPage`.
 */
export class LoginPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', { name: 'Login' });
    }

    get emailInput(): Locator {
        return this.page.getByLabel('Email address *');
    }

    get passwordInput(): Locator {
        return this.page.getByLabel('Password *');
    }

    get loginButton(): Locator {
        return this.page.getByRole('button', { name: 'Login' });
    }

    // ==================== Feedback Locators ====================

    get errorMessage(): Locator {
        return this.page.getByText(Messages.LOGIN_ERROR);
    }

    get emailRequiredError(): Locator {
        return this.page.getByText(Messages.EMAIL_REQUIRED);
    }

    get passwordRequiredError(): Locator {
        return this.page.getByText(Messages.PASSWORD_REQUIRED);
    }

    get emailFormatError(): Locator {
        return this.page.getByText(Messages.EMAIL_FORMAT_INVALID);
    }

    // ==================== Actions ====================

    /**
     * Navigates to the login page using the configured APP_URL and the
     * LOGIN route. Waits for the page to reach DOM content loaded state.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.LOGIN}`, {
            waitUntil: 'domcontentloaded',
        });
    }

    /**
     * Performs login with the provided credentials.
     * Fills in the email and password fields and clicks the login button.
     *
     * Note: no response wait here — invalid input can be rejected by
     * client-side validation without any request being sent. Tests assert
     * the outcome with web-first assertions, which wait automatically.
     *
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<void>} Resolves when the form has been submitted.
     *
     * @example
     * ```ts
     * await pm.loginPage.login('user@example.com', 'password123');
     * await expect(pm.navComponent.userMenu).toBeVisible();
     * ```
     */
    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);

        await this.loginButton.click();
    }
}

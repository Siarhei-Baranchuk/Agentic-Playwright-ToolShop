import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the login page (`/auth/login`), including the TOTP step
 * that replaces the form for users with two-factor authentication.
 *
 * Accessed in tests through the page manager: `pm.loginPage`.
 */
export class LoginPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', { name: PageHeadings.LOGIN });
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

    get googleSignInButton(): Locator {
        return this.page.getByRole('button', { name: 'Sign in with Google' });
    }

    get registerLink(): Locator {
        return this.page.getByRole('link', { name: 'Register your account' });
    }

    get forgotPasswordLink(): Locator {
        return this.page.getByRole('link', { name: 'Forgot your Password?' });
    }

    get totpInput(): Locator {
        return this.page.getByRole('textbox', { name: 'TOTP Code' });
    }

    get verifyTotpButton(): Locator {
        return this.page.getByRole('button', { name: 'Verify TOTP' });
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

    get accountLockedError(): Locator {
        return this.page.getByText(Messages.ACCOUNT_LOCKED);
    }

    get invalidTotpError(): Locator {
        return this.page.getByText(Messages.INVALID_TOTP, { exact: true });
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

    /**
     * Submits a code on the TOTP step shown after the password for users
     * with two-factor authentication.
     *
     * @param {string} code - The 6-digit TOTP code.
     * @returns {Promise<void>} Resolves when the code is submitted.
     */
    async verifyTotp(code: string): Promise<void> {
        await this.totpInput.fill(code);
        await this.verifyTotpButton.click();
    }
}

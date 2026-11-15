import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the profile page (`/account/profile`): personal data,
 * password change and two-factor authentication (TOTP) setup.
 *
 * Accessed in tests through the page manager: `pm.profilePage`.
 */
export class ProfilePage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.PROFILE,
            exact: true,
        });
    }

    get firstNameInput(): Locator {
        return this.page.getByRole('textbox', { name: 'First name' });
    }

    get lastNameInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Last name' });
    }

    get emailInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Email address' });
    }

    get phoneInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Phone' });
    }

    get streetInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Street' });
    }

    get postalCodeInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Postal code' });
    }

    get cityInput(): Locator {
        return this.page.getByRole('textbox', { name: 'City' });
    }

    get countryInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Country' });
    }

    get updateProfileButton(): Locator {
        return this.page.getByRole('button', { name: 'Update Profile' });
    }

    get currentPasswordInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Current Password' });
    }

    get newPasswordInput(): Locator {
        return this.page.getByRole('textbox', {
            name: 'New Password',
            exact: true,
        });
    }

    get confirmPasswordInput(): Locator {
        return this.page.getByRole('textbox', {
            name: 'Confirm New Password',
        });
    }

    get changePasswordButton(): Locator {
        return this.page.getByRole('button', { name: 'Change Password' });
    }

    get totpSecret(): Locator {
        return this.page.getByTestId('totp-secret');
    }

    get totpCodeInput(): Locator {
        return this.page.getByRole('textbox', { name: 'TOTP code' });
    }

    get verifyTotpButton(): Locator {
        return this.page.getByRole('button', { name: 'Verify TOTP' });
    }

    // ==================== Feedback Locators ====================

    get profileUpdatedMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.PROFILE_UPDATED });
    }

    get profileInvalidMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.PROFILE_INVALID });
    }

    get passwordUpdatedMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.PASSWORD_UPDATED });
    }

    passwordError(message: Messages): Locator {
        return this.page.getByRole('alert').filter({ hasText: message });
    }

    get totpEnabledMessage(): Locator {
        return this.page.getByTestId('totp-success');
    }

    get totpErrorMessage(): Locator {
        return this.page.getByTestId('totp-error');
    }

    // ==================== Actions ====================

    /**
     * Opens the profile page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${AppRoutes.ACCOUNT_PROFILE}`
        );
    }

    /**
     * Saves the personal data form.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async updateProfile(): Promise<void> {
        await this.updateProfileButton.click();
    }

    /**
     * Fills and submits the password change form. The new password fields
     * update the form only on keyboard events, so they are typed key by key.
     *
     * @param {string} current - The current password.
     * @param {string} next - The new password.
     * @param {string} confirmation - The repeated new password.
     * @returns {Promise<void>} Resolves when the form is submitted.
     */
    async changePassword(
        current: string,
        next: string,
        confirmation: string = next
    ): Promise<void> {
        await this.currentPasswordInput.fill(current);
        await this.newPasswordInput.clear();
        await this.newPasswordInput.pressSequentially(next);
        await this.confirmPasswordInput.clear();
        await this.confirmPasswordInput.pressSequentially(confirmation);
        await this.changePasswordButton.click();
    }

    /**
     * Submits a TOTP code to finish the two-factor authentication setup.
     *
     * @param {string} code - The 6-digit code.
     * @returns {Promise<void>} Resolves when the code is submitted.
     */
    async verifyTotp(code: string): Promise<void> {
        await this.totpCodeInput.fill(code);
        await this.verifyTotpButton.click();
    }
}

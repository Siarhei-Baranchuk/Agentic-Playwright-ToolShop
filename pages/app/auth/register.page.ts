import { Locator, Page } from '@playwright/test';
import {
    ApiEndpoints,
    AppRoutes,
    Messages,
    PageHeadings,
    PasswordStrengths,
} from '../../../enums/app/app';

/** Registration form values; the address is completed by the postcode lookup */
export type RegistrationDetails = {
    firstName: string;
    lastName: string;
    dob: string;
    country: string;
    postalCode: string;
    houseNumber: string;
    phone: string;
    email: string;
    password: string;
};

/**
 * Page Object for the customer registration form (`/auth/register`).
 * Street, city and state are filled by the postcode lookup once country,
 * postal code and house number are entered.
 *
 * Accessed in tests through the page manager: `pm.registerPage`.
 */
export class RegisterPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', { name: PageHeadings.REGISTER });
    }

    get firstNameInput(): Locator {
        return this.page.getByRole('textbox', { name: 'First name' });
    }

    get lastNameInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Last name' });
    }

    get dobInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Date of Birth *' });
    }

    get countrySelect(): Locator {
        return this.page.getByRole('combobox', { name: 'Country' });
    }

    get postalCodeInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Postal code' });
    }

    get houseNumberInput(): Locator {
        return this.page.getByRole('textbox', { name: 'House number' });
    }

    get streetInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Street' });
    }

    get cityInput(): Locator {
        return this.page.getByRole('textbox', { name: 'City' });
    }

    get stateInput(): Locator {
        return this.page.getByRole('textbox', { name: 'State' });
    }

    get phoneInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Phone' });
    }

    get emailInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Email address' });
    }

    get passwordInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Password' });
    }

    get registerButton(): Locator {
        return this.page.getByRole('button', { name: 'Register' });
    }

    // Level label of the strength indicator; the current level has the `active` class
    passwordStrength(strength: PasswordStrengths): Locator {
        return this.page.getByText(strength, { exact: true });
    }

    // ==================== Feedback Locators ====================

    get registerError(): Locator {
        return this.page.getByTestId('register-error');
    }

    get passwordError(): Locator {
        return this.page.getByTestId('password-error');
    }

    validationError(message: Messages): Locator {
        return this.page.getByRole('alert').filter({ hasText: message });
    }

    // ==================== Actions ====================

    /**
     * Opens the registration page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.REGISTER}`);
    }

    /**
     * Enters country, postal code and house number, which triggers the
     * postcode lookup that fills street, city and state. Waits for the
     * lookup response, so a following submit sees the filled address.
     *
     * @param {string} country - The visible country name.
     * @param {string} postalCode - The postal code.
     * @param {string} houseNumber - The house number.
     * @returns {Promise<void>} Resolves when the lookup has answered.
     */
    async fillAddressLookup(
        country: string,
        postalCode: string,
        houseNumber: string
    ): Promise<void> {
        await this.countrySelect.selectOption({ label: country });
        await this.postalCodeInput.fill(postalCode);
        const lookup = this.page.waitForResponse((response) =>
            response.url().includes(ApiEndpoints.POSTCODE_LOOKUP)
        );
        await this.houseNumberInput.fill(houseNumber);
        await this.houseNumberInput.blur();
        await lookup;
    }

    /**
     * Types the password key by key — the password field only updates the
     * form on keyboard events, so `fill()` leaves the form value empty.
     *
     * @param {string} password - The password to type.
     * @returns {Promise<void>} Resolves when the password is typed and the field is left.
     */
    async typePassword(password: string): Promise<void> {
        await this.passwordInput.clear();
        await this.passwordInput.pressSequentially(password);
        await this.passwordInput.blur();
    }

    /**
     * Fills the whole form; street, city and state come from the postcode lookup.
     *
     * @param {RegistrationDetails} details - The values to enter.
     * @returns {Promise<void>} Resolves when every field is filled.
     */
    async fillForm(details: RegistrationDetails): Promise<void> {
        await this.firstNameInput.fill(details.firstName);
        await this.lastNameInput.fill(details.lastName);
        await this.dobInput.fill(details.dob);
        await this.fillAddressLookup(
            details.country,
            details.postalCode,
            details.houseNumber
        );
        await this.phoneInput.fill(details.phone);
        await this.emailInput.fill(details.email);
        await this.typePassword(details.password);
    }

    /**
     * Submits the form.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async submit(): Promise<void> {
        await this.registerButton.click();
    }
}

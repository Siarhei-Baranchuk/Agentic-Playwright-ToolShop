import { Locator, Page } from '@playwright/test';
import {
    AppRoutes,
    ContactSubjects,
    Messages,
    PageHeadings,
} from '../../../enums/app/app';

/** A file to attach: name, MIME type and content */
export type AttachmentFile = { name: string; mimeType: string; buffer: Buffer };

/**
 * Page Object for the contact form (`/contact`). Guests see name and email
 * fields; logged-in users do not.
 *
 * Accessed in tests through the page manager: `pm.contactPage`.
 */
export class ContactPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', { name: PageHeadings.CONTACT });
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

    get subjectSelect(): Locator {
        return this.page.getByRole('combobox', { name: 'Subject' });
    }

    get messageInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Message *' });
    }

    get attachmentInput(): Locator {
        return this.page.getByLabel('Attachment');
    }

    get sendButton(): Locator {
        return this.page.getByRole('button', { name: 'Send' });
    }

    // ==================== Feedback Locators ====================

    get successMessage(): Locator {
        return this.page
            .getByRole('alert')
            .filter({ hasText: Messages.CONTACT_SUCCESS });
    }

    get subjectRequiredError(): Locator {
        return this.page.getByText(Messages.SUBJECT_REQUIRED);
    }

    get messageRequiredError(): Locator {
        return this.page.getByText(Messages.MESSAGE_REQUIRED);
    }

    get messageTooShortError(): Locator {
        return this.page.getByText(Messages.MESSAGE_TOO_SHORT);
    }

    get emailFormatError(): Locator {
        return this.page.getByText(Messages.EMAIL_FORMAT_INVALID);
    }

    get attachmentNotTxtError(): Locator {
        return this.page.getByText(Messages.ATTACHMENT_NOT_TXT);
    }

    get attachmentNotEmptyError(): Locator {
        return this.page.getByText(Messages.ATTACHMENT_NOT_EMPTY);
    }

    // ==================== Actions ====================

    /**
     * Opens the contact page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(`${process.env.APP_URL!}${AppRoutes.CONTACT}`);
    }

    /**
     * Fills the guest fields (shown only to visitors who are not logged in).
     *
     * @param {{ firstName: string; lastName: string; email: string }} guest - The guest details.
     * @returns {Promise<void>} Resolves when the fields are filled.
     */
    async fillGuestDetails(guest: {
        firstName: string;
        lastName: string;
        email: string;
    }): Promise<void> {
        await this.firstNameInput.fill(guest.firstName);
        await this.lastNameInput.fill(guest.lastName);
        await this.emailInput.fill(guest.email);
    }

    /**
     * Fills the subject and message.
     *
     * @param {ContactSubjects} subject - The subject option.
     * @param {string} message - The message text.
     * @returns {Promise<void>} Resolves when the fields are filled.
     */
    async fillMessage(
        subject: ContactSubjects,
        message: string
    ): Promise<void> {
        await this.subjectSelect.selectOption(subject);
        await this.messageInput.fill(message);
    }

    /**
     * Attaches a file.
     *
     * @param {AttachmentFile} file - The file (name, MIME type, content).
     * @returns {Promise<void>} Resolves when the file is set.
     */
    async attach(file: AttachmentFile): Promise<void> {
        await this.attachmentInput.setInputFiles(file);
    }

    /**
     * Submits the form.
     *
     * @returns {Promise<void>} Resolves when the button is clicked.
     */
    async send(): Promise<void> {
        await this.sendButton.click();
    }
}

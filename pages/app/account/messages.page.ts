import { Locator, Page } from '@playwright/test';
import { AppRoutes, Messages, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the contact messages list (`/account/messages`).
 *
 * Accessed in tests through the page manager: `pm.messagesPage`.
 */
export class MessagesPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.MESSAGES,
        });
    }

    // Body rows only: the header row holds column headers, not cells
    get rows(): Locator {
        return this.page
            .getByRole('table')
            .getByRole('row')
            .filter({ has: this.page.getByRole('cell') });
    }

    row(subject: string): Locator {
        return this.rows.filter({
            has: this.page.getByRole('cell', { name: subject, exact: true }),
        });
    }

    detailsLink(subject: string): Locator {
        return this.row(subject).getByRole('link', { name: 'Details' });
    }

    // ==================== Feedback Locators ====================

    get emptyMessage(): Locator {
        return this.page.getByText(Messages.NO_MESSAGES);
    }

    // ==================== Actions ====================

    /**
     * Opens the messages page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${AppRoutes.ACCOUNT_MESSAGES}`
        );
    }

    /**
     * Opens the detail page of a message.
     *
     * @param {string} subject - The subject shown in the table.
     * @returns {Promise<void>} Resolves when the link is clicked.
     */
    async openDetails(subject: string): Promise<void> {
        await this.detailsLink(subject).click();
    }
}

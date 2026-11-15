import { Locator, Page } from '@playwright/test';
import { AppRoutes, PageHeadings } from '../../../enums/app/app';

/**
 * Page Object for the invoices list (`/account/invoices`).
 *
 * Accessed in tests through the page manager: `pm.invoicesPage`.
 */
export class InvoicesPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get heading(): Locator {
        return this.page.getByRole('heading', {
            name: PageHeadings.INVOICES,
        });
    }

    get table(): Locator {
        return this.page.getByRole('table');
    }

    // Body rows only: the header row holds column headers, not cells
    get rows(): Locator {
        return this.table
            .getByRole('row')
            .filter({ has: this.page.getByRole('cell') });
    }

    row(invoiceNumber: string): Locator {
        return this.rows.filter({
            has: this.page.getByRole('cell', {
                name: invoiceNumber,
                exact: true,
            }),
        });
    }

    detailsLink(invoiceNumber: string): Locator {
        return this.row(invoiceNumber).getByRole('link', { name: 'Details' });
    }

    // ==================== Actions ====================

    /**
     * Opens the invoices page.
     *
     * @returns {Promise<void>} Resolves when navigation is complete.
     */
    async open(): Promise<void> {
        await this.page.goto(
            `${process.env.APP_URL!}${AppRoutes.ACCOUNT_INVOICES}`
        );
    }

    /**
     * Opens the detail page of an invoice.
     *
     * @param {string} invoiceNumber - The invoice number shown in the table.
     * @returns {Promise<void>} Resolves when the link is clicked.
     */
    async openDetails(invoiceNumber: string): Promise<void> {
        await this.detailsLink(invoiceNumber).click();
    }
}

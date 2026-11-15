import { Locator, Page } from '@playwright/test';

/**
 * Page Object for an invoice detail page (`/account/invoices/:id`):
 * general data, billing address, payment method and the product lines.
 *
 * Accessed in tests through the page manager: `pm.invoiceDetailPage`.
 */
export class InvoiceDetailPage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get downloadPdfButton(): Locator {
        return this.page.getByRole('button', { name: 'Download PDF' });
    }

    get invoiceNumberInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Invoice Number' });
    }

    get totalInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Total' });
    }

    get streetInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Street' });
    }

    get cityInput(): Locator {
        return this.page.getByRole('textbox', { name: 'City' });
    }

    get postalCodeInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Postal code' });
    }

    get paymentMethodInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Payment Method' });
    }

    // Body rows of the products table
    get productRows(): Locator {
        return this.page
            .getByRole('table')
            .getByRole('row')
            .filter({ has: this.page.getByRole('cell') });
    }

    productRow(productName: string): Locator {
        return this.productRows.filter({
            has: this.page.getByRole('cell', {
                name: productName,
                exact: true,
            }),
        });
    }
}

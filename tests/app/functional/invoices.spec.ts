/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import { PaymentMethodLabels } from '../../../enums/app/app';
import type { Invoice } from '../../../fixtures/api/schemas/app/invoiceSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import {
    createCombinationCart,
    createInvoice,
    getCatalogProducts,
} from '../../../helpers/app/checkout';
import { startBrowserSession } from '../../../helpers/app/createStorageState';
import { required } from '../../../helpers/util/util';

/** Lines of a cart from `createCombinationCart`: one regular, one rental product */
const COMBINATION_CART_LINES = 2;

test.describe('invoices', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page, registeredUser }) => {
        await startBrowserSession(page, registeredUser.token);
    });

    test(
        'should show an empty invoice table to a customer without orders',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the customer has no orders', async () => {
                await pm.accountPage.open();
                await expect(pm.accountPage.heading).toBeVisible();
            });

            await test.step('Steps: open the invoices page', async () => {
                await pm.invoicesPage.open();
            });

            await test.step('Expected: the table has no rows', async () => {
                await expect(pm.invoicesPage.table).toBeVisible();
                await expect(pm.invoicesPage.rows).toHaveCount(0);
            });
        }
    );

    test.describe('with an order', () => {
        /** An invoice of the customer: one regular and one rental product */
        let invoice: Invoice;

        test.beforeEach(async ({ apiRequest, registeredUser }) => {
            const catalog = await getCatalogProducts(apiRequest);
            const cartId = await createCombinationCart(apiRequest, catalog);
            invoice = await createInvoice(
                apiRequest,
                registeredUser.token,
                cartId
            );
        });

        test(
            'should list the invoice with its number and total',
            { tag: '@smoke' },
            async ({ pm }) => {
                const invoiceNumber = required(
                    invoice.invoice_number,
                    'invoice number'
                );

                await test.step('Preconditions: the customer has placed an order', async () => {
                    await pm.accountPage.open();
                    await expect(pm.accountPage.heading).toBeVisible();
                });

                await test.step('Steps: open the invoices page', async () => {
                    await pm.invoicesPage.open();
                });

                await test.step('Expected: the invoice row shows the number and the total', async () => {
                    await expect(
                        pm.invoicesPage.row(invoiceNumber)
                    ).toBeVisible();
                    await expect(
                        pm.invoicesPage.row(invoiceNumber)
                    ).toContainText(
                        required(invoice.total, 'total').toFixed(2)
                    );
                });
            }
        );

        test(
            'should show the invoice details',
            { tag: '@regression' },
            async ({ pm }) => {
                const invoiceNumber = required(
                    invoice.invoice_number,
                    'invoice number'
                );

                await test.step('Preconditions: the invoice is listed', async () => {
                    await pm.invoicesPage.open();
                    await expect(
                        pm.invoicesPage.row(invoiceNumber)
                    ).toBeVisible();
                });

                await test.step('Steps: open the invoice details', async () => {
                    await pm.invoicesPage.openDetails(invoiceNumber);
                });

                await test.step('Expected: number, billing address, payment method and lines are shown', async () => {
                    await expect(
                        pm.invoiceDetailPage.invoiceNumberInput
                    ).toHaveValue(invoiceNumber);
                    await expect(pm.invoiceDetailPage.streetInput).toHaveValue(
                        required(invoice.billing_street, 'billing street')
                    );
                    await expect(pm.invoiceDetailPage.cityInput).toHaveValue(
                        required(invoice.billing_city, 'billing city')
                    );
                    await expect(
                        pm.invoiceDetailPage.paymentMethodInput
                    ).toHaveValue(PaymentMethodLabels.CASH_ON_DELIVERY);
                    // The combination cart holds one regular and one rental product
                    await expect(pm.invoiceDetailPage.productRows).toHaveCount(
                        COMBINATION_CART_LINES
                    );
                });
            }
        );

        // FIXME: defect #30 — the invoice PDF is never generated, so "Download
        // PDF" stays disabled on every invoice.
        test.skip(
            'should offer the invoice PDF for download',
            { tag: '@regression' },
            async ({ pm }) => {
                const invoiceNumber = required(
                    invoice.invoice_number,
                    'invoice number'
                );

                await test.step('Preconditions: the invoice is listed', async () => {
                    await pm.invoicesPage.open();
                    await expect(
                        pm.invoicesPage.row(invoiceNumber)
                    ).toBeVisible();
                });

                await test.step('Steps: open the invoice details', async () => {
                    await pm.invoicesPage.openDetails(invoiceNumber);
                });

                await test.step('Expected: "Download PDF" is enabled', async () => {
                    await expect(
                        pm.invoiceDetailPage.downloadPdfButton
                    ).toBeEnabled();
                });
            }
        );
    });
});

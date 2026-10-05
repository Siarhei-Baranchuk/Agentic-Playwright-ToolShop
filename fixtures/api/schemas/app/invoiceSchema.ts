import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';
import { ProductSchema } from './productSchema';

/*
 * Invoice and payment schemas, built from the OpenAPI contract. Response
 * schemas list no `required` properties, so every property is optional.
 */

/** Payment details — one shape per payment method (`oneOf` in the contract). */
export const BankTransferDetailsSchema = z.strictObject({
    bank_name: z.string().optional(),
    account_name: z.string().optional(),
    account_number: z.string().optional(),
});
export const CreditCardDetailsSchema = z.strictObject({
    credit_card_number: z.string().optional(),
    expiration_date: z.string().optional(),
    cvv: z.string().optional(),
    card_holder_name: z.string().optional(),
});
export const GiftCardDetailsSchema = z.strictObject({
    gift_card_number: z.string().optional(),
    validation_code: z.string().optional(),
});
export const BuyNowPayLaterDetailsSchema = z.strictObject({
    monthly_installments: z.string().optional(),
});
export const CashOnDeliveryDetailsSchema = z.strictObject({});

export const PaymentDetailsSchema = z.union([
    BankTransferDetailsSchema,
    CreditCardDetailsSchema,
    GiftCardDetailsSchema,
    BuyNowPayLaterDetailsSchema,
    CashOnDeliveryDetailsSchema,
]);

/** `InvoiceRequest` — body of `POST /invoices` (required fields per the contract). */
export const InvoiceRequestSchema = z.strictObject({
    billing_street: z.string(),
    billing_city: z.string(),
    billing_state: z.string(),
    billing_country: z.string(),
    billing_postal_code: z.string(),
    payment_method: z.string(),
    payment_details: PaymentDetailsSchema,
    cart_id: z.string(),
});

/** `InvoiceLineResponse` */
export const InvoiceLineSchema = z.strictObject({
    id: z.string().optional(),
    invoice_id: z.string().optional(),
    product_id: z.string().optional(),
    unit_price: z.number().optional(),
    discount_percentage: z.number().optional(),
    discounted_price: z.number().optional(),
    quantity: z.int().optional(),
    product: ProductSchema.optional(),
});

/** `InvoiceResponse` */
export const InvoiceSchema = z.strictObject({
    id: z.string().optional(),
    user_id: z.string().optional(),
    invoice_date: z.string().optional(),
    invoice_number: z.string().optional(),
    billing_street: z.string().optional(),
    billing_city: z.string().optional(),
    billing_country: z.string().optional(),
    billing_state: z.string().optional(),
    billing_postal_code: z.string().optional(),
    additional_discount_percentage: z.number().optional(),
    additional_discount_amount: z.number().optional(),
    subtotal: z.number().optional(),
    total: z.number().optional(),
    status: z.string().optional(),
    status_message: z.string().optional(),
    invoicelines: z.array(InvoiceLineSchema).optional(),
    created_at: z.string().optional(),
    // FIXME: undocumented — see docs/test-plan.md, defect #27
    eco_discount_percentage: z.number().optional(),
    eco_discount_amount: z.number().optional(),
    payment: z
        .strictObject({
            payment_method: z.string(),
            payment_details: PaymentDetailsSchema,
        })
        .optional(),
});

/** `PaginatedInvoiceResponse` — `GET /invoices`, `GET|QUERY /invoices/search`. */
export const PaginatedInvoiceSchema = z.strictObject({
    current_page: z.int().optional(),
    data: z.array(InvoiceSchema).optional(),
    from: z.int().optional(),
    last_page: z.int().optional(),
    per_page: z.int().optional(),
    to: z.int().optional(),
    total: z.int().optional(),
});

/** `DownloadResponse` */
export const DownloadSchema = z.strictObject({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    filename: z.string().optional(),
});

/** `PaymentResponse` — `POST /payment/check`. */
export const PaymentResponseSchema = z.strictObject({
    message: z.string().optional(),
});

export type InvoiceRequest = zOutput<typeof InvoiceRequestSchema>;
export type Invoice = zOutput<typeof InvoiceSchema>;
export type PaginatedInvoices = zOutput<typeof PaginatedInvoiceSchema>;
export type Download = zOutput<typeof DownloadSchema>;
export type PaymentResponse = zOutput<typeof PaymentResponseSchema>;

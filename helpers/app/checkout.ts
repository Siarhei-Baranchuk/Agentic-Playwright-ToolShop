import { expect } from '@playwright/test';
import {
    ApiEndpoints,
    PaymentMethods,
    SpecialProducts,
} from '../../enums/app/app';
import type { ApiRequestFn } from '../../fixtures/api/api-types';
import {
    CartCreated,
    CartCreatedSchema,
    CartItemAdded,
    CartItemAddedSchema,
} from '../../fixtures/api/schemas/app/cartSchema';
import {
    Invoice,
    InvoiceSchema,
} from '../../fixtures/api/schemas/app/invoiceSchema';
import {
    PostcodeLookup,
    PostcodeLookupSchema,
} from '../../fixtures/api/schemas/app/postcodeSchema';
import {
    PaginatedProducts,
    PaginatedProductSchema,
    Product,
} from '../../fixtures/api/schemas/app/productSchema';
import { generatePaymentDetails } from '../../test-data/factories/app/checkout.factory';
import { VALID_POSTCODE } from '../../test-data/static/app/checkout';
import { fillPath, required } from '../util/util';

/*
 * Checkout helpers for API setup: carts, billing addresses, catalog
 * products of a given kind, invoices. Carts and invoices cannot be deleted
 * by a customer; they disappear with the hourly reset of the demo database.
 */

/** Billing fields of an invoice. */
export type BillingAddress = {
    billing_street: string;
    billing_city: string;
    billing_state: string;
    billing_country: string;
    billing_postal_code: string;
};

/** Catalog products grouped by the kind the checkout rules care about. */
export type CatalogProducts = {
    regular: Product[];
    rental: Product[];
    eco: Product[];
    locationOffer: Product[];
};

/**
 * Builds a billing address the backend accepts: the city and state must
 * match what the postcode lookup returns for the country + postcode.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @returns {Promise<BillingAddress>} A valid billing address.
 */
export async function lookupBillingAddress(
    apiRequest: ApiRequestFn
): Promise<BillingAddress> {
    const { status, body } = await apiRequest<PostcodeLookup>({
        method: 'GET',
        url: ApiEndpoints.POSTCODE_LOOKUP,
        params: { ...VALID_POSTCODE },
    });
    expect(status).toBe(200);
    expect(PostcodeLookupSchema.parse(body)).toBeTruthy();

    return {
        billing_street: required(body.street, 'street'),
        billing_city: required(body.city, 'city'),
        billing_state: required(body.state, 'state'),
        billing_country: VALID_POSTCODE.country,
        billing_postal_code: VALID_POSTCODE.postcode,
    };
}

/**
 * Creates a cart via `POST /carts`, optionally at a location (for the geo discount).
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {{ lat: number; lng: number }} location - Optional cart coordinates.
 * @returns {Promise<string>} The cart id.
 */
export async function createCart(
    apiRequest: ApiRequestFn,
    location?: { lat: number; lng: number }
): Promise<string> {
    const { status, body } = await apiRequest<CartCreated>({
        method: 'POST',
        url: ApiEndpoints.CARTS,
        body: location ?? null,
    });
    expect(status).toBe(201);
    expect(CartCreatedSchema.parse(body)).toBeTruthy();
    return required(body.id, 'cart id');
}

/**
 * Adds a product to a cart via `POST /carts/{id}`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} cartId - The cart.
 * @param {string} productId - The product.
 * @param {number} quantity - How many to add.
 * @returns {Promise<void>} Resolves when the item is added.
 */
export async function addToCart(
    apiRequest: ApiRequestFn,
    cartId: string,
    productId: string,
    quantity: number
): Promise<void> {
    const { status, body } = await apiRequest<CartItemAdded>({
        method: 'POST',
        url: fillPath(ApiEndpoints.CART, { cartId }),
        body: { product_id: productId, quantity },
    });
    expect(status).toBe(200);
    expect(CartItemAddedSchema.parse(body)).toBeTruthy();
}

/**
 * Reads the first catalog pages and groups in-stock products by kind:
 * regular (non-rental), rental, eco-friendly (CO₂ A/B, non-rental) and
 * location offers (non-rental).
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @returns {Promise<CatalogProducts>} Products grouped by kind.
 */
export async function getCatalogProducts(
    apiRequest: ApiRequestFn
): Promise<CatalogProducts> {
    const products: Product[] = [];
    const pages: Record<string, string | number>[] = [
        { page: 1 },
        { page: 2 },
        { page: 3 },
        { is_rental: 'true' },
    ];
    for (const params of pages) {
        const { status, body } = await apiRequest<PaginatedProducts>({
            method: 'GET',
            url: ApiEndpoints.PRODUCTS,
            params,
        });
        expect(status).toBe(200);
        expect(PaginatedProductSchema.parse(body)).toBeTruthy();
        products.push(...(body.data ?? []));
    }

    const inStock = products.filter(({ in_stock }) => in_stock === true);
    const regular = inStock.filter(({ is_rental }) => is_rental === false);
    return {
        regular: regular.filter(
            ({ name }) => name !== SpecialProducts.THOR_HAMMER
        ),
        rental: products.filter(({ is_rental }) => is_rental === true),
        eco: regular.filter(({ is_eco_friendly }) => is_eco_friendly === true),
        locationOffer: regular.filter(
            ({ is_location_offer }) => is_location_offer === true
        ),
    };
}

/**
 * Creates a cart holding one regular and one rental product — it earns the
 * combination discount, so `additional_discount_percentage` is a number
 * (without a discount the API answers `null`, against the contract).
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {CatalogProducts} catalog - Products from `getCatalogProducts`.
 * @returns {Promise<string>} The cart id.
 */
export async function createCombinationCart(
    apiRequest: ApiRequestFn,
    catalog: CatalogProducts
): Promise<string> {
    const cartId = await createCart(apiRequest);
    await addToCart(
        apiRequest,
        cartId,
        required(catalog.regular.at(0)?.id, 'regular product'),
        1
    );
    await addToCart(
        apiRequest,
        cartId,
        required(catalog.rental.at(0)?.id, 'rental product'),
        1
    );
    return cartId;
}

/**
 * Creates an invoice via `POST /invoices` for a filled cart. Use a cart from
 * `createCombinationCart` — see its note on `additional_discount_percentage`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} token - The buyer's access token.
 * @param {string} cartId - A cart with items.
 * @param {PaymentMethods} method - The payment method.
 * @returns {Promise<Invoice>} The created invoice.
 */
export async function createInvoice(
    apiRequest: ApiRequestFn,
    token: string,
    cartId: string,
    method: PaymentMethods = PaymentMethods.CASH_ON_DELIVERY
): Promise<Invoice> {
    const { status, body } = await apiRequest<Invoice>({
        method: 'POST',
        url: ApiEndpoints.INVOICES,
        headers: token,
        body: {
            ...(await lookupBillingAddress(apiRequest)),
            payment_method: method,
            payment_details: generatePaymentDetails(method),
            cart_id: cartId,
        },
    });
    expect(status).toBe(201);
    expect(InvoiceSchema.parse(body)).toBeTruthy();
    return body;
}

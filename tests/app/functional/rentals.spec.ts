import { ApiEndpoints } from '../../../enums/app/app';
import {
    PaginatedProducts,
    PaginatedProductSchema,
    Product,
} from '../../../fixtures/api/schemas/app/productSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { required } from '../../../helpers/util/util';

const RENTAL_HOURS = 3;

test.describe('rentals', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    let rentals: Product[];

    test.beforeAll(async ({ apiRequest }) => {
        const { status, body } = await apiRequest<PaginatedProducts>({
            method: 'GET',
            url: ApiEndpoints.PRODUCTS,
            params: { is_rental: 'true' },
        });
        expect(status).toBe(200);
        expect(PaginatedProductSchema.parse(body)).toBeTruthy();
        rentals = body.data ?? [];
    });

    test(
        'should list every rental product',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the rental products are known (API)', async () => {
                expect(rentals.length).toBeGreaterThan(0);
            });

            await test.step('Steps: open the rentals page', async () => {
                await pm.rentalsPage.open();
            });

            await test.step('Expected: the page lists exactly the rental products', async () => {
                await expect(pm.rentalsPage.heading).toBeVisible();
                await expect(pm.rentalsPage.rentalNames).toHaveText(
                    rentals.map(({ name }) => required(name, 'name'))
                );
            });
        }
    );

    test(
        'should price a rental by the hour with a duration slider',
        { tag: '@regression' },
        async ({ pm }) => {
            const rental = required(rentals.at(0), 'rental product');
            const hourly = required(rental.price, 'price');

            await test.step('Preconditions: the rental detail page is open', async () => {
                await pm.rentalsPage.open();
                await pm.rentalsPage.openRental(required(rental.name, 'name'));
                await expect(pm.productDetailPage.name).toHaveText(
                    required(rental.name, 'name')
                );
            });

            await test.step('Expected: a duration slider replaces the quantity buttons', async () => {
                await expect(pm.productDetailPage.durationSlider).toBeVisible();
                await expect(pm.productDetailPage.quantityInput).toBeHidden();
                await expect(pm.productDetailPage.totalPrice).toContainText(
                    hourly.toFixed(2)
                );
            });

            await test.step(`Steps: set the duration to ${RENTAL_HOURS} hours`, async () => {
                await pm.productDetailPage.setDuration(RENTAL_HOURS);
            });

            await test.step('Expected: the total is the hourly rate times the hours', async () => {
                await expect(pm.productDetailPage.duration).toContainText(
                    `${RENTAL_HOURS} hour(s)`
                );
                await expect(pm.productDetailPage.totalPrice).toContainText(
                    (hourly * RENTAL_HOURS).toFixed(2)
                );
            });
        }
    );
});

import type { Product } from '../../../fixtures/api/schemas/app/productSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { getCatalogProducts } from '../../../helpers/app/checkout';
import { startBrowserSession } from '../../../helpers/app/createStorageState';
import { addFavorite } from '../../../helpers/app/users';
import { required } from '../../../helpers/util/util';

test.describe('favorites', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    /** An in-stock catalog product; favorites only reference it */
    let product: Product;

    test.beforeEach(async ({ page, apiRequest, registeredUser }) => {
        [product] = (await getCatalogProducts(apiRequest)).regular;
        await startBrowserSession(page, registeredUser.token);
    });

    test(
        'should tell a customer without favorites that the list is empty',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the customer has no favorites', async () => {
                await pm.accountPage.open();
                await expect(pm.accountPage.heading).toBeVisible();
            });

            await test.step('Steps: open the favorites page', async () => {
                await pm.favoritesPage.open();
            });

            await test.step('Expected: the empty-list message is shown', async () => {
                await expect(pm.favoritesPage.emptyMessage).toBeVisible();
                await expect(pm.favoritesPage.cards).toHaveCount(0);
            });
        }
    );

    test(
        'should add a product to the favorites from its page',
        { tag: '@smoke' },
        async ({ pm }) => {
            const name = required(product.name, 'product name');

            await test.step('Preconditions: the product page is open', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
                await expect(
                    pm.productDetailPage.addToFavouritesButton
                ).toBeVisible();
            });

            await test.step('Steps: add the product to the favorites', async () => {
                await pm.productDetailPage.addToFavourites();
            });

            await test.step('Expected: the product is reported as added', async () => {
                await expect(
                    pm.productDetailPage.favouriteAddedMessage
                ).toBeVisible();
            });

            await test.step('Steps: open the favorites page', async () => {
                await pm.favoritesPage.open();
            });

            await test.step('Expected: the product is listed', async () => {
                await expect(pm.favoritesPage.card(name)).toBeVisible();
            });
        }
    );

    test(
        'should not add a product to the favorites twice',
        { tag: '@regression' },
        async ({ pm, apiRequest, registeredUser }) => {
            await test.step('Preconditions: the product is a favorite and its page is open', async () => {
                await addFavorite(
                    apiRequest,
                    registeredUser.token,
                    required(product.id, 'product id')
                );
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
                await expect(
                    pm.productDetailPage.addToFavouritesButton
                ).toBeVisible();
            });

            await test.step('Steps: add the product to the favorites again', async () => {
                await pm.productDetailPage.addToFavourites();
            });

            await test.step('Expected: the product is reported as already added', async () => {
                await expect(
                    pm.productDetailPage.favouriteAlreadyAddedMessage
                ).toBeVisible();
            });
        }
    );

    test(
        'should remove a product from the favorites',
        { tag: '@regression' },
        async ({ pm, apiRequest, registeredUser }) => {
            const name = required(product.name, 'product name');

            await test.step('Preconditions: the product is listed on the favorites page', async () => {
                await addFavorite(
                    apiRequest,
                    registeredUser.token,
                    required(product.id, 'product id')
                );
                await pm.favoritesPage.open();
                await expect(pm.favoritesPage.card(name)).toBeVisible();
            });

            await test.step('Steps: delete the favorite', async () => {
                await pm.favoritesPage.remove(name);
            });

            await test.step('Expected: the product is gone and the list is empty', async () => {
                await expect(pm.favoritesPage.card(name)).toBeHidden();
                await expect(pm.favoritesPage.emptyMessage).toBeVisible();
            });
        }
    );
});

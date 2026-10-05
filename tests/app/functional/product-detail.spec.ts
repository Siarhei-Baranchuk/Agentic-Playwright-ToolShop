import { ApiEndpoints } from '../../../enums/app/app';
import {
    PaginatedProducts,
    PaginatedProductSchema,
    Product,
} from '../../../fixtures/api/schemas/app/productSchema';
import {
    ProductSpecList,
    ProductSpecListSchema,
} from '../../../fixtures/api/schemas/app/productSpecSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { getCatalogProducts } from '../../../helpers/app/checkout';
import { required } from '../../../helpers/util/util';

test.describe('product detail', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    let product: Product;
    let outOfStock: Product;

    test.beforeAll(async ({ apiRequest }) => {
        product = required(
            (await getCatalogProducts(apiRequest)).regular.at(0),
            'in-stock product'
        );
        const { status, body } = await apiRequest<PaginatedProducts>({
            method: 'GET',
            url: ApiEndpoints.PRODUCTS,
        });
        expect(status).toBe(200);
        expect(PaginatedProductSchema.parse(body)).toBeTruthy();
        outOfStock = required(
            body.data?.find(({ in_stock }) => in_stock === false),
            'out-of-stock product'
        );
    });

    test(
        'should show the name, price, description, category and brand',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the product is known (API)', async () => {
                expect(product.name).toBeTruthy();
            });

            await test.step('Steps: open the product page', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
            });

            await test.step('Expected: the product details match the catalog data', async () => {
                await expect(pm.productDetailPage.name).toHaveText(
                    required(product.name, 'name')
                );
                await expect(pm.productDetailPage.price).toHaveText(
                    required(product.price, 'price').toFixed(2)
                );
                await expect(pm.productDetailPage.description).toContainText(
                    required(product.description, 'description').slice(0, 50)
                );
                await expect(pm.productDetailPage.brandBadge).toHaveText(
                    required(product.brand?.name, 'brand')
                );
                await expect(pm.productDetailPage.categoryBadge).toHaveText(
                    required(product.category?.name, 'category')
                );
            });
        }
    );

    test(
        'should change the quantity with plus and minus, never below 1',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the product page shows quantity 1', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
                await expect(pm.productDetailPage.quantityInput).toHaveValue(
                    '1'
                );
            });

            await test.step('Steps: press plus twice', async () => {
                await pm.productDetailPage.increaseQuantityButton.click();
                await pm.productDetailPage.increaseQuantityButton.click();
            });

            await test.step('Expected: the quantity is 3', async () => {
                await expect(pm.productDetailPage.quantityInput).toHaveValue(
                    '3'
                );
            });

            await test.step('Steps: press minus three times', async () => {
                for (let press = 0; press < 3; press++)
                    await pm.productDetailPage.decreaseQuantityButton.click();
            });

            await test.step('Expected: the quantity stops at 1', async () => {
                await expect(pm.productDetailPage.quantityInput).toHaveValue(
                    '1'
                );
            });
        }
    );

    test(
        'should add the product to the cart and update the cart badge',
        { tag: '@smoke' },
        async ({ pm }) => {
            await test.step('Preconditions: the product page is open with an empty cart', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
                await expect(
                    pm.productDetailPage.addToCartButton
                ).toBeEnabled();
                await expect(pm.navComponent.cartLink).toBeHidden();
            });

            await test.step('Steps: set quantity 2 and add to cart', async () => {
                await pm.productDetailPage.increaseQuantityButton.click();
                await pm.productDetailPage.addToCart();
            });

            await test.step('Expected: the confirmation is shown and the cart badge counts 2', async () => {
                await expect(
                    pm.productDetailPage.addedToCartMessage
                ).toBeVisible();
                await expect(pm.navComponent.cartLink).toHaveText('2');
            });
        }
    );

    test(
        'should ask a visitor to log in before adding a favourite',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the product page is open', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
                await expect(
                    pm.productDetailPage.addToFavouritesButton
                ).toBeVisible();
            });

            await test.step('Steps: add the product to the favourites', async () => {
                await pm.productDetailPage.addToFavourites();
            });

            await test.step('Expected: the unauthorized message is shown', async () => {
                await expect(
                    pm.productDetailPage.favouriteUnauthorizedMessage
                ).toBeVisible();
            });
        }
    );

    test(
        'should not let an out-of-stock product be added to the cart',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: an out-of-stock product is known (API)', async () => {
                expect(outOfStock.in_stock).toBe(false);
            });

            await test.step('Steps: open the out-of-stock product', async () => {
                await pm.productDetailPage.open(
                    required(outOfStock.id, 'product id')
                );
            });

            await test.step('Expected: "Out of stock" is shown and "Add to cart" is disabled', async () => {
                await expect(
                    pm.productDetailPage.outOfStockLabel
                ).toBeVisible();
                await expect(
                    pm.productDetailPage.addToCartButton
                ).toBeDisabled();
            });
        }
    );

    test(
        'should list the product specifications',
        { tag: '@regression' },
        async ({ pm, apiRequest }) => {
            let specs: ProductSpecList = [];

            await test.step('Preconditions: the specifications are known (API)', async () => {
                const { status, body } = await apiRequest<ProductSpecList>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCT_SPECS.replace(
                        '{productId}',
                        required(product.id, 'product id')
                    ),
                });
                expect(status).toBe(200);
                expect(ProductSpecListSchema.parse(body)).toBeTruthy();
                specs = body;
            });

            await test.step('Steps: open the product page', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
            });

            await test.step('Expected: one table row per specification', async () => {
                await expect(
                    pm.productDetailPage.specificationsHeading
                ).toBeVisible();
                await expect(
                    pm.productDetailPage.specificationRows
                ).toHaveCount(specs.length);
            });
        }
    );

    test(
        'should open a related product',
        { tag: '@regression' },
        async ({ pm }) => {
            let relatedName = '';

            await test.step('Preconditions: related products are listed', async () => {
                await pm.productDetailPage.open(
                    required(product.id, 'product id')
                );
                await expect(
                    pm.productDetailPage.relatedProductsHeading
                ).toBeVisible();
                await expect(
                    pm.productDetailPage.relatedProductLinks
                ).not.toHaveCount(0);
                relatedName = required(
                    (
                        await pm.productDetailPage.relatedProductLinks
                            .getByRole('heading', { level: 5 })
                            .allInnerTexts()
                    ).at(0),
                    'related product'
                ).trim();
            });

            await test.step('Steps: open the first related product', async () => {
                await pm.productDetailPage
                    .relatedProductLink(relatedName)
                    .getByRole('heading')
                    .click();
            });

            await test.step('Expected: its detail page is shown', async () => {
                await expect(pm.productDetailPage.name).toHaveText(relatedName);
            });
        }
    );
});

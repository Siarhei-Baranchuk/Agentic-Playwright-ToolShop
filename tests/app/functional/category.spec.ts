import { SeedCategories } from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';
import { CATEGORY_SLUGS } from '../../../test-data/static/app/shop';

const CATEGORIES_WITH_PRODUCTS = [
    SeedCategories.HAND_TOOLS,
    SeedCategories.POWER_TOOLS,
    SeedCategories.OTHER,
];

test.describe('category pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const category of CATEGORIES_WITH_PRODUCTS) {
        test(
            `should show the "${category}" products with the catalog filters`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the category exists in the navigation', async () => {
                    await pm.homePage.open();
                    await expect(
                        pm.navComponent.categoriesButton
                    ).toBeVisible();
                });

                await test.step(`Steps: open /category/${CATEGORY_SLUGS[category]}`, async () => {
                    await pm.categoryPage.open(CATEGORY_SLUGS[category]);
                });

                await test.step('Expected: the page is titled after the category and lists products with filters', async () => {
                    await expect(
                        pm.categoryPage.heading(category)
                    ).toBeVisible();
                    await expect(
                        pm.categoryPage.grid.productNames
                    ).not.toHaveCount(0);
                    await expect(
                        pm.categoryPage.filters.sortSelect
                    ).toBeVisible();
                    await expect(
                        pm.categoryPage.filters.categoriesHeading
                    ).toBeVisible();
                    await expect(
                        pm.categoryPage.filters.brandsHeading
                    ).toBeVisible();
                });
            }
        );
    }

    test(
        `should tell the visitor that "${SeedCategories.SPECIAL_TOOLS}" has no products`,
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the home page is open', async () => {
                await pm.homePage.open();
                await expect(pm.navComponent.categoriesButton).toBeVisible();
            });

            await test.step(`Steps: open /category/${CATEGORY_SLUGS[SeedCategories.SPECIAL_TOOLS]}`, async () => {
                await pm.categoryPage.open(
                    CATEGORY_SLUGS[SeedCategories.SPECIAL_TOOLS]
                );
            });

            await test.step('Expected: the empty-category message is shown', async () => {
                await expect(
                    pm.categoryPage.heading(SeedCategories.SPECIAL_TOOLS)
                ).toBeVisible();
                await expect(
                    pm.categoryPage.filters.noProductsFound
                ).toBeVisible();
                await expect(pm.categoryPage.grid.productCards).toHaveCount(0);
            });
        }
    );
});

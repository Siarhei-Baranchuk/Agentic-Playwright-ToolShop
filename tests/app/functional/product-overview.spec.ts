/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import {
    ApiEndpoints,
    SeedBrands,
    SeedSubCategories,
    SortOptions,
} from '../../../enums/app/app';
import type { ApiRequestFn } from '../../../fixtures/api/api-types';
import {
    BrandList,
    BrandListSchema,
} from '../../../fixtures/api/schemas/app/brandSchema';
import {
    CategoryTreeList,
    CategoryTreeListSchema,
} from '../../../fixtures/api/schemas/app/categorySchema';
import {
    PaginatedProducts,
    PaginatedProductSchema,
} from '../../../fixtures/api/schemas/app/productSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { required } from '../../../helpers/util/util';
import { generateSearchToken } from '../../../test-data/factories/app/catalog.factory';
import {
    DEFAULT_PRICE_RANGE,
    KNOWN_SEARCH_TERM,
    PRICE_FILTER_MAX,
} from '../../../test-data/static/app/shop';

/**
 * Product names of the first catalog page for a filter, read from the API
 * (the oracle for the UI filters). The catalog applies the default price
 * range, so the oracle does too.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {Record<string, string>} params - `by_category` / `by_brand` filter.
 * @returns {Promise<string[]>} The product names.
 */
async function apiProductNames(
    apiRequest: ApiRequestFn,
    params: Record<string, string>
): Promise<string[]> {
    const { status, body } = await apiRequest<PaginatedProducts>({
        method: 'GET',
        url: ApiEndpoints.PRODUCTS,
        params: {
            ...params,
            between: `price,${DEFAULT_PRICE_RANGE.min},${DEFAULT_PRICE_RANGE.max}`,
        },
    });
    expect(status).toBe(200);
    expect(PaginatedProductSchema.parse(body)).toBeTruthy();
    return (body.data ?? [])
        .map(({ name }) => required(name, 'product name'))
        .sort();
}

const SORTS = [
    { option: SortOptions.NAME_ASC, by: 'name', direction: 1 },
    { option: SortOptions.NAME_DESC, by: 'name', direction: -1 },
    { option: SortOptions.PRICE_ASC, by: 'price', direction: 1 },
    { option: SortOptions.PRICE_DESC, by: 'price', direction: -1 },
] as const;

test.describe('product overview', () => {
    // The shop is checked as a visitor who is not logged in
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ pm }) => {
        await pm.homePage.open();
    });

    test(
        'should show a grid of product cards with name and price',
        { tag: '@smoke' },
        async ({ pm }) => {
            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step('Steps: read the product cards', async () => {
                await expect(pm.homePage.grid.productCards).not.toHaveCount(0);
            });

            await test.step('Expected: every card shows a name and a price', async () => {
                const count = await pm.homePage.grid.productCards.count();
                await expect(pm.homePage.grid.productPrices).toHaveCount(count);
                expect(
                    (await pm.homePage.grid.getPrices()).every(
                        (price) => price > 0
                    )
                ).toBe(true);
            });
        }
    );

    test(
        'should open the product detail page from a card',
        { tag: '@smoke' },
        async ({ pm }) => {
            let name = '';

            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
                name = required(
                    (await pm.homePage.grid.getProductNames()).at(0),
                    'product name'
                );
            });

            await test.step('Steps: click the first product card', async () => {
                await pm.homePage.grid.openProduct(name);
            });

            await test.step('Expected: the product detail page shows that product', async () => {
                await expect(pm.productDetailPage.name).toHaveText(name);
                await expect(
                    pm.productDetailPage.addToCartButton
                ).toBeVisible();
            });
        }
    );

    test(
        'should show other products on the next page',
        { tag: '@regression' },
        async ({ pm }) => {
            let firstPage: string[] = [];

            await test.step('Preconditions: the first page is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
                firstPage = await pm.homePage.grid.getProductNames();
            });

            await test.step('Steps: go to page 2', async () => {
                await pm.homePage.grid.goToPage(2);
            });

            await test.step('Expected: page 2 shows different products', async () => {
                await expect(async () => {
                    const secondPage = await pm.homePage.grid.getProductNames();
                    expect(secondPage.length).toBeGreaterThan(0);
                    expect(
                        secondPage.filter((name) => firstPage.includes(name))
                    ).toHaveLength(0);
                }).toPass();
            });
        }
    );

    test(
        'should show only products that match the search term',
        { tag: '@smoke' },
        async ({ pm }) => {
            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step(`Steps: search for "${KNOWN_SEARCH_TERM}"`, async () => {
                await pm.homePage.filters.search(KNOWN_SEARCH_TERM);
            });

            await test.step('Expected: the caption names the term and every result matches it', async () => {
                await expect(pm.homePage.filters.searchCaption).toContainText(
                    KNOWN_SEARCH_TERM
                );
                await expect(async () => {
                    const names = await pm.homePage.grid.getProductNames();
                    expect(names.length).toBeGreaterThan(0);
                    expect(
                        names.every((name) =>
                            name.toLowerCase().includes(KNOWN_SEARCH_TERM)
                        )
                    ).toBe(true);
                }).toPass();
            });
        }
    );

    test(
        'should tell the visitor when the search finds nothing',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step('Steps: search for a term no product contains', async () => {
                await pm.homePage.filters.search(generateSearchToken());
            });

            await test.step('Expected: the no-results message is shown and no card is left', async () => {
                await expect(pm.homePage.filters.noProductsFound).toBeVisible();
                await expect(pm.homePage.grid.productCards).toHaveCount(0);
            });
        }
    );

    // FIXME: the "X" button clears the search field, but the grid keeps showing the search results. See docs/test-plan.md, defect #35.
    test.skip(
        'should show the whole catalog again after resetting the search',
        { tag: '@regression' },
        async ({ pm }) => {
            let fullCatalog: string[] = [];

            await test.step('Preconditions: a search is active', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
                fullCatalog = await pm.homePage.grid.getProductNames();
                await pm.homePage.filters.search(KNOWN_SEARCH_TERM);
                await expect(pm.homePage.filters.searchCaption).toBeVisible();
            });

            await test.step('Steps: reset the search with "X"', async () => {
                await pm.homePage.filters.resetSearch();
            });

            await test.step('Expected: the full catalog is shown again', async () => {
                await expect(pm.homePage.filters.searchCaption).toBeHidden();
                await expect(pm.homePage.grid.productNames).toHaveText(
                    fullCatalog
                );
            });
        }
    );

    for (const { option, by, direction } of SORTS) {
        test(
            `should sort the products by ${option}`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the catalog is loaded', async () => {
                    await expect(pm.homePage.grid.productNames).not.toHaveCount(
                        0
                    );
                });

                await test.step(`Steps: sort by "${option}"`, async () => {
                    await pm.homePage.filters.sortBy(option);
                });

                await test.step('Expected: the cards are in that order', async () => {
                    await expect(pm.homePage.filters.sortSelect).toHaveValue(
                        new RegExp(by)
                    );
                    await expect(async () => {
                        const values =
                            by === 'name'
                                ? await pm.homePage.grid.getProductNames()
                                : await pm.homePage.grid.getPrices();
                        const sorted = [...values].sort((a, b) =>
                            typeof a === 'number' && typeof b === 'number'
                                ? (a - b) * direction
                                : String(a).localeCompare(String(b)) * direction
                        );
                        expect(values).toEqual(sorted);
                    }).toPass();
                });
            }
        );
    }

    test(
        'should show only products of the ticked sub-category',
        { tag: '@regression' },
        async ({ pm, apiRequest }) => {
            let expected: string[] = [];

            await test.step('Preconditions: the products of the sub-category are known (API)', async () => {
                const { status, body } = await apiRequest<CategoryTreeList>({
                    method: 'GET',
                    url: ApiEndpoints.CATEGORIES_TREE,
                });
                expect(status).toBe(200);
                expect(CategoryTreeListSchema.parse(body)).toBeTruthy();
                const sub = body
                    .flatMap(({ sub_categories }) => sub_categories ?? [])
                    .find(({ name }) => name === SeedSubCategories.SANDER);
                expected = await apiProductNames(apiRequest, {
                    by_category: required(sub?.id, 'sub-category id'),
                });
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step(`Steps: tick "${SeedSubCategories.SANDER}"`, async () => {
                await pm.homePage.filters.filterByCategory(
                    SeedSubCategories.SANDER
                );
            });

            await test.step('Expected: the grid shows exactly those products', async () => {
                await expect(async () => {
                    expect(
                        (await pm.homePage.grid.getProductNames()).sort()
                    ).toEqual(expected);
                }).toPass();
            });
        }
    );

    test(
        'should tick all child categories when the parent is ticked',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the category filter is shown', async () => {
                await expect(
                    pm.homePage.filters.categoriesHeading
                ).toBeVisible();
            });

            await test.step('Steps: tick the parent "Power Tools"', async () => {
                await pm.homePage.filters.filterByCategory('Power Tools');
            });

            await test.step('Expected: its child categories are ticked too', async () => {
                await expect(
                    pm.homePage.filters.categoryCheckbox(
                        SeedSubCategories.DRILL
                    )
                ).toBeChecked();
                await expect(
                    pm.homePage.filters.categoryCheckbox(
                        SeedSubCategories.SANDER
                    )
                ).toBeChecked();
            });
        }
    );

    test(
        'should show only products of the ticked brand',
        { tag: '@regression' },
        async ({ pm, apiRequest }) => {
            let expected: string[] = [];

            await test.step('Preconditions: the products of the brand are known (API)', async () => {
                const { status, body } = await apiRequest<BrandList>({
                    method: 'GET',
                    url: ApiEndpoints.BRANDS,
                });
                expect(status).toBe(200);
                expect(BrandListSchema.parse(body)).toBeTruthy();
                const brand = body.find(
                    ({ name }) => name === SeedBrands.MIGHTYCRAFT
                );
                expected = await apiProductNames(apiRequest, {
                    by_brand: required(brand?.id, 'brand id'),
                });
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step(`Steps: tick "${SeedBrands.MIGHTYCRAFT}"`, async () => {
                await pm.homePage.filters.filterByBrand(SeedBrands.MIGHTYCRAFT);
            });

            await test.step('Expected: the grid shows exactly those products', async () => {
                await expect(async () => {
                    expect(
                        (await pm.homePage.grid.getProductNames()).sort()
                    ).toEqual(expected);
                }).toPass();
            });
        }
    );

    test(
        'should show only eco-friendly products when filtered',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step('Steps: tick "Show only eco-friendly products"', async () => {
                await pm.homePage.filters.showEcoFriendlyOnly();
            });

            await test.step('Expected: every card carries the eco badge', async () => {
                await expect(async () => {
                    const cards = await pm.homePage.grid.productCards.count();
                    expect(cards).toBeGreaterThan(0);
                    await expect(pm.homePage.grid.ecoBadges).toHaveCount(cards);
                }).toPass();
            });
        }
    );

    test(
        'should show only products within the price range',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the price slider is at its default range', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
                await expect(
                    pm.homePage.filters.maxPriceSlider
                ).toHaveAttribute('aria-valuenow', '100');
            });

            await test.step(`Steps: move the upper handle to $${PRICE_FILTER_MAX}`, async () => {
                await pm.homePage.filters.setMaxPrice(PRICE_FILTER_MAX);
            });

            await test.step(`Expected: no product costs more than $${PRICE_FILTER_MAX}`, async () => {
                await expect(
                    pm.homePage.filters.maxPriceSlider
                ).toHaveAttribute('aria-valuenow', String(PRICE_FILTER_MAX));
                await expect(async () => {
                    const prices = await pm.homePage.grid.getPrices();
                    expect(prices.length).toBeGreaterThan(0);
                    expect(
                        prices.every((price) => price <= PRICE_FILTER_MAX)
                    ).toBe(true);
                }).toPass();
            });
        }
    );

    test(
        'should mark products that are out of stock',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
            });

            await test.step('Steps: look for out-of-stock cards on the first page', async () => {
                await expect(pm.homePage.grid.outOfStockCards).not.toHaveCount(
                    0
                );
            });

            await test.step('Expected: an out-of-stock card still shows its name and price', async () => {
                const cards = await pm.homePage.grid.outOfStockCards.count();
                await expect(
                    pm.homePage.grid.outOfStockCards.getByRole('heading', {
                        level: 5,
                    })
                ).toHaveCount(cards);
                await expect(
                    pm.homePage.grid.outOfStockCards.getByTestId(
                        'product-price'
                    )
                ).toHaveCount(cards);
            });
        }
    );

    test(
        'should show the comparison bar for selected products and clear it',
        { tag: '@regression' },
        async ({ pm }) => {
            let names: string[] = [];

            await test.step('Preconditions: the catalog is loaded', async () => {
                await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
                names = (await pm.homePage.grid.getProductNames()).slice(0, 2);
            });

            await test.step('Steps: add two products to the comparison', async () => {
                for (const name of names) await pm.homePage.grid.compare(name);
            });

            await test.step('Expected: the bar counts two selected products', async () => {
                await expect(
                    pm.homePage.comparisonBar.selectedCount
                ).toHaveText(/2 product\(s\) selected/);
            });

            await test.step('Steps: clear the comparison', async () => {
                await pm.homePage.comparisonBar.clearAll();
            });

            await test.step('Expected: the bar is gone', async () => {
                await expect(
                    pm.homePage.comparisonBar.selectedCount
                ).toBeHidden();
            });
        }
    );
});

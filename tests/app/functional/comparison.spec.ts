/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('product comparison', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    let names: string[] = [];

    test.beforeEach(async ({ pm }) => {
        await pm.homePage.open();
        await expect(pm.homePage.grid.productNames).not.toHaveCount(0);
        names = (await pm.homePage.grid.getProductNames()).slice(0, 2);
    });

    test(
        'should explain that nothing is selected yet',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: no product is selected for comparison', async () => {
                await expect(
                    pm.homePage.comparisonBar.selectedCount
                ).toBeHidden();
            });

            await test.step('Steps: open the comparison page', async () => {
                await pm.comparisonPage.open();
            });

            await test.step('Expected: the empty message and a link back to the products are shown', async () => {
                await expect(pm.comparisonPage.emptyMessage).toBeVisible();
                await expect(
                    pm.comparisonPage.browseProductsLink
                ).toBeVisible();
            });
        }
    );

    test(
        'should compare two products side by side',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: two products are selected', async () => {
                for (const name of names) await pm.homePage.grid.compare(name);
                await expect(
                    pm.homePage.comparisonBar.selectedCount
                ).toHaveText(/2 product\(s\) selected/);
            });

            await test.step('Steps: open the comparison', async () => {
                await pm.homePage.comparisonBar.compareNow();
            });

            await test.step('Expected: both products are compared on price, brand, category, availability and CO₂', async () => {
                await expect(pm.comparisonPage.heading).toBeVisible();
                for (const name of names)
                    await expect(
                        pm.comparisonPage.removeButton(name)
                    ).toBeVisible();
                await expect(pm.comparisonPage.rowHeaders).toContainText([
                    'Price',
                    'Brand',
                    'Category',
                    'Availability',
                    'CO₂ Rating',
                ]);
            });
        }
    );

    // FIXME: "Show differences only" keeps the rows whose values are equal (Brand, Category, Availability, CO₂ Rating, Eco-Friendly). See docs/test-plan.md, defect #37.
    test.skip(
        'should hide equal rows when showing differences only',
        { tag: '@regression' },
        async ({ pm }) => {
            let allRows = 0;

            await test.step('Preconditions: two products are compared', async () => {
                for (const name of names) await pm.homePage.grid.compare(name);
                await pm.homePage.comparisonBar.compareNow();
                await expect(pm.comparisonPage.rowHeaders).not.toHaveCount(0);
                allRows = await pm.comparisonPage.rowHeaders.count();
            });

            await test.step('Steps: tick "Show differences only"', async () => {
                await pm.comparisonPage.showDifferencesCheckbox.check();
            });

            await test.step('Expected: fewer rows are shown, the price row stays', async () => {
                await expect(async () => {
                    expect(
                        await pm.comparisonPage.rowHeaders.count()
                    ).toBeLessThan(allRows);
                }).toPass();
                await expect(
                    pm.comparisonPage.rowHeaders.filter({ hasText: 'Price' })
                ).toBeVisible();
            });
        }
    );

    test(
        'should remove one product and clear the rest',
        { tag: '@regression' },
        async ({ pm }) => {
            const [removed, kept] = names;

            await test.step('Preconditions: two products are compared', async () => {
                for (const name of names) await pm.homePage.grid.compare(name);
                await pm.homePage.comparisonBar.compareNow();
                await expect(pm.comparisonPage.table).toBeVisible();
            });

            await test.step('Steps: remove the first product', async () => {
                await pm.comparisonPage.remove(removed);
            });

            await test.step('Expected: only the second product is left', async () => {
                await expect(
                    pm.comparisonPage.removeButton(removed)
                ).toBeHidden();
                await expect(
                    pm.comparisonPage.removeButton(kept)
                ).toBeVisible();
            });

            await test.step('Steps: clear the comparison', async () => {
                await pm.comparisonPage.clearAllButton.click();
            });

            await test.step('Expected: the empty message is shown', async () => {
                await expect(pm.comparisonPage.emptyMessage).toBeVisible();
            });
        }
    );
});

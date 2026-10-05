import {
    GermanLabels,
    Languages,
    SeedCategories,
} from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('navigation and language', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ pm }) => {
        await pm.homePage.open();
    });

    test(
        'should list the categories and rentals in the menu',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the main menu is shown', async () => {
                await expect(pm.navComponent.categoriesButton).toBeVisible();
            });

            await test.step('Steps: open the "Categories" menu', async () => {
                await pm.navComponent.openCategories();
            });

            await test.step('Expected: the seeded categories and "Rentals" are listed', async () => {
                await expect(
                    pm.navComponent.categoriesList.getByRole('link')
                ).toHaveText([...Object.values(SeedCategories), 'Rentals']);
            });
        }
    );

    test(
        'should open a category from the menu',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the main menu is shown', async () => {
                await expect(pm.navComponent.categoriesButton).toBeVisible();
            });

            await test.step(`Steps: open "${SeedCategories.POWER_TOOLS}" from the menu`, async () => {
                await pm.navComponent.openCategory(SeedCategories.POWER_TOOLS);
            });

            await test.step('Expected: the category page is shown', async () => {
                await expect(
                    pm.categoryPage.heading(SeedCategories.POWER_TOOLS)
                ).toBeVisible();
            });
        }
    );

    test(
        'should open the privacy policy from the footer',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the footer link is shown', async () => {
                await expect(pm.navComponent.footerPrivacyLink).toBeVisible();
            });

            await test.step('Steps: click "Privacy Policy"', async () => {
                await pm.navComponent.footerPrivacyLink.click();
            });

            await test.step('Expected: the privacy policy is shown', async () => {
                await expect(pm.privacyPage.heading).toBeVisible();
            });
        }
    );

    test(
        'should offer every supported language',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the language selector shows English', async () => {
                await expect(pm.navComponent.languageButton).toHaveText(
                    Languages.EN
                );
            });

            await test.step('Steps: open the language selector', async () => {
                await pm.navComponent.languageButton.click();
            });

            await test.step('Expected: all seven languages are offered', async () => {
                for (const language of Object.values(Languages)) {
                    await expect(
                        pm.navComponent.languageOption(language)
                    ).toBeVisible();
                }
            });
        }
    );

    test(
        'should switch the UI to German and remember it after a reload',
        { tag: '@regression' },
        async ({ pm, page }) => {
            await test.step('Preconditions: the UI is in English', async () => {
                await expect(pm.navComponent.languageButton).toHaveText(
                    Languages.EN
                );
            });

            await test.step('Steps: select German', async () => {
                await pm.navComponent.selectLanguage(Languages.DE);
            });

            await test.step('Expected: the menu is in German', async () => {
                await expect(
                    pm.navComponent.menuLink(GermanLabels.HOME)
                ).toBeVisible();
                await expect(
                    pm.navComponent.menuLink(GermanLabels.CONTACT)
                ).toBeVisible();
                await expect(pm.navComponent.languageButton).toHaveText(
                    Languages.DE
                );
            });

            await test.step('Steps: reload the page', async () => {
                await page.reload();
            });

            await test.step('Expected: German is kept', async () => {
                await expect(
                    pm.navComponent.menuLink(GermanLabels.HOME)
                ).toBeVisible();
                await expect(pm.navComponent.languageButton).toHaveText(
                    Languages.DE
                );
            });
        }
    );
});

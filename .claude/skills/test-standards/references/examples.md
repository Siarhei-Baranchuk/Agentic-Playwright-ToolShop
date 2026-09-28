# Test Standards — Worked Examples

Four end-to-end spec patterns, one per test type the scaffold supports. Phase numbers refer to `test-standards/SKILL.md`.

## Example 1: Functional smoke test

```typescript
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('login', () => {
    test.beforeEach(async ({ resetStorageState, pm }) => {
        await resetStorageState();
        await pm.loginPage.open();
    });

    test(
        'should login successfully with valid credentials',
        { tag: '@smoke' },
        async ({ pm }) => {
            await test.step('Preconditions: the login form is displayed', async () => {
                await expect(pm.loginPage.loginButton).toBeVisible();
            });

            await test.step('Steps: user enters valid credentials', async () => {
                await pm.loginPage.login(
                    process.env.APP_EMAIL!,
                    process.env.APP_PASSWORD!
                );
            });

            await test.step('Expected: the user menu is displayed', async () => {
                await expect(pm.navComponent.userMenu).toBeVisible();
            });
        }
    );
});
```

## Example 2: Data-driven regression (TS static data)

```typescript
import { expect, test } from '../../../fixtures/pom/test-options';
import { INVALID_LOGIN_ATTEMPTS } from '../../../test-data/static/app/invalidCredentials';

test.describe('login - invalid credentials', () => {
    test.beforeEach(async ({ resetStorageState, pm }) => {
        await resetStorageState();
        await pm.loginPage.open();
    });

    for (const { description, email, password } of INVALID_LOGIN_ATTEMPTS) {
        test(
            `should show error for ${description}`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the login form is displayed', async () => {
                    await expect(pm.loginPage.loginButton).toBeVisible();
                });

                await test.step(`Steps: user submits ${description}`, async () => {
                    await pm.loginPage.login(email, password);
                });

                await test.step('Expected: the error message is displayed', async () => {
                    await expect(pm.loginPage.errorMessage).toBeVisible();
                });
            }
        );
    }
});
```

## Example 3: Destructive test with cleanup

```typescript
import { expect, test } from '../../../fixtures/pom/test-options';
import { ApiEndpoints } from '../../../enums/app/app';

test.describe('admin - data management', () => {
    test.afterEach(async ({ apiRequest }) => {
        await apiRequest({
            method: 'POST',
            url: ApiEndpoints.RESET_DATA, // illustrative
            headers: process.env.ACCESS_TOKEN,
        });
    });

    test(
        'should delete all inactive users',
        { tag: '@destructive' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'DELETE',
                url: '/api/admin/inactive-users',
                headers: process.env.ACCESS_TOKEN,
            });

            expect(status).toBe(204);
        }
    );
});
```

Run with: `npm run test:destructive` (single worker, excluded from `npm test`).

## Example 4: E2E multi-feature journey

```typescript
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('todo - full journey', () => {
    test.beforeEach(async ({ resetStorageState, pm }) => {
        await resetStorageState();
        await pm.homePage.open();
    });

    test(
        'should add, complete, filter, clear, and verify final state',
        { tag: '@e2e' },
        async ({ pm }) => {
            await test.step('Preconditions: user creates three todos', async () => {
                await pm.todoPage.addTodo('Buy milk');
                await pm.todoPage.addTodo('Walk dog');
                await pm.todoPage.addTodo('Read book');
                await expect(pm.todoPage.todoItems).toHaveCount(3);
            });

            await test.step('Steps: user completes one and filters to active', async () => {
                await pm.todoPage.completeTodo('Buy milk');
                await pm.todoPage.filterByActive();
            });

            await test.step('Expected: only the two active todos remain visible', async () => {
                await expect(pm.todoPage.todoItems).toHaveCount(2);
            });

            await test.step('Steps: user clears completed', async () => {
                await pm.todoPage.clearCompleted();
            });

            await test.step('Expected: completed count is zero', async () => {
                await expect(pm.todoPage.completedCount).toHaveText('0');
            });
        }
    );
});
```

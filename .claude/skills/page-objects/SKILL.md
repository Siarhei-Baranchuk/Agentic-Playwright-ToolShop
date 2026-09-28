---
name: page-objects
description: Page Object Model pattern for the Playwright scaffold — class structure, get-accessor locator pattern, action-method conventions, component composition, registration in the PageManager (`pm` fixture), and the mandatory exploration-first workflow. Use when creating a new page object, adding or updating locators on an existing page object, adding a new reusable component, or registering a page in the PageManager. For the locator priority order and feedback/validation-message rules see the selectors skill; for the terminal-only live-app exploration tool see the playwright-cli skill; for the DI wiring see the fixtures skill; for UI message strings and endpoint enums see the enums skill.
---

# Page Object Model

## Critical

- **Locators are `get` accessors** returning `Locator`. This is a style/readability convention — Playwright's `Locator` is lazy either way (it only queries the DOM when an action runs), so `get` vs `readonly` field behave identically at runtime. Use `get` for consistency with the rest of the scaffold.
- **Constructor uses `private readonly page: Page`.** No other visibility modifiers, no alternative DI patterns.
- **The constructor only stores `page`** (and creates composed components). **NEVER** navigate, call APIs or do other real work in it — the `PageManager` creates every page object for every test.
- **Page objects import `Locator, Page` from `@playwright/test`** — never from `fixtures/pom/test-options.ts` (that's for spec files and fixtures).
- **NEVER** use `expect` in a page object. Page objects expose locators and perform actions; **all assertions live in tests** (or in auth/setup helpers). No `xxxAndVerify()` methods.
- **JSDoc rules:**
    - **Forbidden** on locator getters and on any method that returns a `Locator`. Names are self-documenting.
    - **Required** (with `@param` and `@returns`) on every action method.
    - **Allowed** on component fields (e.g. `readonly nav: NavigationComponent`) — these are not locators.
- **Three locator sections** when the page has forms or CRUD: interactive-element locators, feedback/validation-message locators, action methods. Feedback locators are not optional — see the `selectors` skill.
- **Feedback/message strings come from `enums/{area}/*`** (e.g. `Messages.LOGIN_ERROR`). Never hardcoded strings inside `getByText(...)`.
- **NEVER** `page.waitForTimeout(...)` inside a page object. When an action must wait, use `locator.waitFor()` or `page.waitForResponse(...)`.
- **Exploration with `playwright-cli` is mandatory** before writing any locators (see the `selectors` skill's Exploration-First Workflow). No guessing from wireframes, docs, or screenshots. If the app is unavailable, stop and say so — never ship placeholder locators.
- **Register every new page object in `pages/page-manager.ts`** (`readonly` field + one constructor line). Tests reach it as `pm.<name>` through the `pm` fixture, never via `new PageObject(page)`. Do not add per-page fixtures.

## File Locations

> **`{area}` is a placeholder.** Before creating or referencing any path below, run `ls pages/` to discover the real subdirectory names in this repo (e.g., `front-office`, `back-office`) and use those instead.

| Type         | Directory           | Naming                | Scaffold example                                                   |
| ------------ | ------------------- | --------------------- | ------------------------------------------------------------------ |
| Page objects | `pages/{area}/`     | `[name].page.ts`      | `pages/app/login.page.ts` (`LoginPage`)                            |
| Components   | `pages/components/` | `[name].component.ts` | `pages/components/navigation.component.ts` (`NavigationComponent`) |

## Page Object Pattern

```typescript
import { Locator, Page } from '@playwright/test';
import { Messages } from '../../enums/app/app';

export class ExamplePage {
    constructor(private readonly page: Page) {}

    // ==================== Locators ====================

    get emailInput(): Locator {
        return this.page.getByLabel('Email');
    }

    get submitButton(): Locator {
        return this.page.getByRole('button', { name: 'Submit' });
    }

    // ==================== Feedback Locators ====================

    get successMessage(): Locator {
        return this.page.getByText(Messages.LOGIN_SUCCESS);
    }

    get errorMessage(): Locator {
        return this.page.getByText(Messages.LOGIN_ERROR);
    }

    get requiredFieldError(): Locator {
        return this.page.getByText(Messages.REQUIRED_FIELD);
    }

    // ==================== Actions ====================

    /**
     * Submits the form and waits for the API response.
     * @param {string} email - The user's email address.
     * @returns {Promise<void>}
     */
    async submitForm(email: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.submitButton.click();
        await this.page.waitForResponse((r) => r.url().includes('/api/submit'));
    }
}
```

Every page object that handles forms or CRUD operations must have three locator sections: interactive element locators, feedback/validation message locators, and action methods. Feedback locators are not optional — see the `selectors` skill for the full list of feedback types to capture.

## Rules

### Locators as getters

Use `get accessor` returning `Locator`. Both `get` and `readonly field` work identically at runtime (Playwright's `Locator` is lazy), but `get` is the scaffold convention — terser, locators stay grouped in the class body, constructor stays focused on dependencies.

```typescript
// PREFERRED -- the scaffold's convention
get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit' });
}
```

### Constructor pattern

```typescript
constructor(private readonly page: Page) {}
```

### No JSDoc on locators

JSDoc is **forbidden** on locator getters and on any method that returns a `Locator`. The name documents what it is:

```typescript
// CORRECT -- no comment needed
get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit' });
}

// WRONG -- locators don't need JSDoc
/** The submit button. */
get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit' });
}
```

JSDoc is **required** on action methods (see below).

### Action methods

- **Action methods** represent complete user actions (`login()`, `submitForm()`, `addToCart()`).
- **Action methods never assert** — the test asserts, using the page object's locators (`await expect(pm.navComponent.userMenu).toBeVisible()`). This keeps every check visible in the test and in the report.
- When an action must wait for an API response or state change, use `page.waitForResponse(...)` or `locator.waitFor()`. Never `page.waitForTimeout(...)`.
- Always specify an explicit return type (`Promise<void>` is the common case).
- JSDoc with `@param` and `@returns` is required; an `@example` block is encouraged for non-trivial methods.

### Imports in page objects

Page objects import from `@playwright/test` (not from `test-options.ts`):

```typescript
import { Locator, Page } from '@playwright/test';
```

## Component composition

Reusable UI fragments (headers, modals, sidebars) are defined as **components** and composed into page objects:

```typescript
// pages/components/navigation.component.ts
import { Locator, Page } from '@playwright/test';

export class NavigationComponent {
    constructor(private readonly page: Page) {}

    get homeLink(): Locator {
        return this.page.getByRole('link', { name: 'Home' });
    }

    async clickHome(): Promise<void> {
        await this.homeLink.click();
    }

    async logout(): Promise<void> {
        await this.page.getByTestId('user-menu-button').click();
        await this.page.getByRole('button', { name: 'Logout' }).click();
    }
}
```

Two homes for components:

- **Site-wide components** (header, navigation, footer) are exposed by the page manager, next to the pages: `pm.navComponent`. The scaffold's `NavigationComponent` works this way.
- **Page-specific components** (a filter panel that exists only on the catalog page) are composed into their page object:

```typescript
// pages/app/catalog.page.ts
import { Page } from '@playwright/test';
import { FiltersComponent } from '../components/filters.component';

export class CatalogPage {
    /** Filter panel shown only on the catalog page */
    readonly filtersComponent: FiltersComponent;

    constructor(private readonly page: Page) {
        this.filtersComponent = new FiltersComponent(page);
    }
}

// Usage in tests
await pm.navComponent.clickHome(); // site-wide component
await pm.catalogPage.filtersComponent.byBrand('X'); // page-specific component
```

The `filtersComponent: FiltersComponent` field is a component, not a locator, so the JSDoc-forbidden rule does not apply — a short descriptive JSDoc is allowed.

## Instructions

### Phase 1: Verify prerequisites

Before writing any code:

- Run `ls pages/` to resolve `{area}` (e.g. `app`, `front-office`, `back-office`). Do not guess.
- Identify which enums the page needs (`Messages`, `ApiEndpoints`, `Roles`, etc.). If a required enum member does not yet exist, extend it via the `enums` skill **first** — verify UI text with `playwright-cli` before encoding it.
- Confirm the scaffold has a matching schema (for pages that trigger API calls you need to wait for / assert on) via `ls fixtures/api/schemas/`; if missing, create it via the `api-testing` skill.

### Phase 2: Explore the live application (mandatory)

Never create a page object from assumptions, wireframes, or documentation alone.

1. **Open and authenticate** — use **only** `playwright-cli` in the terminal (not IDE browser MCP, not Cursor browser tools, not any substitute). Orchestrator rule: **No Substitute UI Exploration**. If the page doesn't load or auth fails, stop and notify the human.
2. **Explore like a user** — navigate through the feature, trigger CRUD operations, observe forms, buttons, feedback messages, validation errors, and dynamic content.
3. Record every observed element's role, accessible name, label, and (if applicable) test ID.

Read the full workflow in the `selectors` skill (`.claude/skills/selectors/SKILL.md` → "Exploration-First Workflow") and `playwright-cli` skill for the specific commands.

**Forbidden:** Skipping exploration. If the application is unavailable, say so and wait — do not create placeholder locators with guessed names.

### Phase 3: Plan the page object's test coverage

Draft, in writing, which paths the page object needs to support:

- **Happy paths** — the main user flow succeeds.
- **Validation paths** — field-level rejections (empty, bad format, boundary).
- **Error paths** — server rejections, surfaced via error feedback messages.
- **Edge cases** — timeouts, intermittent network, concurrent edits, long strings.

The plan drives **which feedback locators** end up on the page object. A page with 5 happy-path buttons and 0 feedback locators is incomplete.

### Phase 4: Build the class

Follow the Page Object Pattern above. Specifically:

- Import `Locator, Page` from `@playwright/test` — no `expect`.
- Constructor: `private readonly page: Page` — plus component instantiation if composing.
- Three locator sections (Interactive / Feedback / Actions), each separated by a visual header comment. Feedback locators reference `enums/{area}/*` values, never hardcoded strings.
- Every action method: explicit return type, `@param` / `@returns` JSDoc, waits via `waitForResponse` / `locator.waitFor()` when needed, no `waitForTimeout`, no `expect`.
- Reusable fragments → component under `pages/components/` and composed via a `readonly field: ComponentClass` in the page object (see Component composition above).

### Phase 5: Register the page object in the PageManager

Add a `readonly` field and one line in the constructor of `pages/page-manager.ts`. The field name is the class name in camelCase: pages keep the `Page` suffix (`LoginPage` → `loginPage`, `ProductDetailsPage` → `productDetailsPage`), components keep the `Component` suffix with a short name (`NavigationComponent` → `navComponent`):

```typescript
// pages/page-manager.ts
import { DashboardPage } from './app/dashboard.page';

export class PageManager {
    readonly dashboardPage: DashboardPage; // 1. readonly field

    constructor(page: Page) {
        this.dashboardPage = new DashboardPage(page); // 2. create it in the constructor
    }
}
```

No fixture or `mergeTests()` change is needed — the `pm` fixture in `fixtures/pom/page-object-fixture.ts` already exposes the manager. For the deeper DI rules (new fixture categories, lifecycle, Built-in Fixtures table) see the `fixtures` skill.

### Phase 6: Consume from tests via `pm`

```typescript
import { expect, test } from '../../../fixtures/pom/test-options';

test(
    'should show error on bad login',
    { tag: '@regression' },
    async ({ pm }) => {
        await test.step('Preconditions: the login form is displayed', async () => {
            await pm.loginPage.open();
            await expect(pm.loginPage.loginButton).toBeVisible();
        });

        await test.step('Steps: user logs in with a wrong password', async () => {
            await pm.loginPage.login('bad@example.com', 'wrong');
        });

        await test.step('Expected: the error message is displayed', async () => {
            await expect(pm.loginPage.errorMessage).toBeVisible();
        });
    }
);
```

**Never** `new LoginPage(page)` or `new PageManager(page)` inside a test — always go through the `pm` fixture.

## See Also

- **`selectors`** skill — exploration-first workflow (4 steps), selector priority order, feedback/validation message rules, forbidden patterns.
- **`playwright-cli`** skill — the terminal-only live-app exploration tool (no IDE browser MCP substitutes).
- **`fixtures`** skill — full DI rules, the `pm` fixture, `FrameworkFixtures` / `HelperFixtures`, `mergeTests`, Built-in Fixtures table.
- **`enums`** skill — where `Messages.*`, `ApiEndpoints.*`, `Roles`, `StorageStatePaths` live; how to add new values with live-text verification.
- **`common-tasks`** skill — prompt templates for "Add a New Page Object (With / Without Exploration)" and "Add Locators to Existing Page".
- **`api-testing`** skill — helper fixtures and factories used from page-object tests.
- **`debugging`** skill — when a test using this page object fails, classify the failure (TimeoutError on action, locator returned multiple, etc.) and use the right tool to investigate before changing the page object.
- **`references/examples.md`** — three end-to-end walkthroughs (new page, locator addition, component extraction).
- **`references/troubleshooting.md`** — common page-object pitfalls and their fixes.

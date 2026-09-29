# Playwright Test Framework

Playwright + TypeScript test automation framework with built-in rules for AI-assisted development in **Claude Code**.

- Page Object Model with a single `pm` fixture (PageManager) that exposes every page
- API testing with Zod schema validation
- Test data via Faker factories and typed static data
- Authentication via saved storage state and a shared API token
- ESLint + Prettier + Husky pre-commit checks
- `CLAUDE.md` Constitution + 16 skills that teach Claude how to write tests in this codebase, with a hook that blocks forbidden patterns

> The files under `pages/`, `tests/`, `enums/`, `test-data/` and `fixtures/api/schemas/` are **examples** written against a public demo app. They show the patterns to follow — replace them with your application's pages, tests and data.

---

## Quick Start

Requirements: **Node.js 22.22+**, **Git**.

Copy this folder, rename it, and from inside it run:

```bash
git init                                # first — Husky installs its hooks during npm install
npm install
npx playwright install chromium          # browser for tests and playwright cli
cp env/.env.example env/.env.dev        # then fill in your values
```

Verify the setup:

```bash
npm run setup:check                     # Node version + playwright cli
npx tsc --noEmit && npm run lint        # TypeScript + ESLint
```

### Optional: run the examples against the demo app

The example tests target [practicesoftwaretesting.com](https://practicesoftwaretesting.com) (public demo credentials). To see a green run before adapting the framework, put this in `env/.env.dev`:

```bash
APP_URL=https://practicesoftwaretesting.com
API_URL=https://api.practicesoftwaretesting.com
APP_EMAIL=customer@practicesoftwaretesting.com
APP_PASSWORD=welcome01
ADMIN_EMAIL=admin@practicesoftwaretesting.com
ADMIN_PASSWORD=welcome01
```

Then run `npm test`.

---

## Adapting to Your Application

1. **Project name** — set `name` in `package.json` (currently `agentic-playwright`).
2. **Environment** — fill `env/.env.dev` (`APP_URL`, `API_URL`, `APP_EMAIL`, `APP_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`). Add new variables to `env/.env.example` too.
3. **Enums** — replace the values in `enums/app/app.ts` (API endpoints, UI routes, UI messages).
4. **Test id attribute** — set `testIdAttribute` in `playwright.config.ts` to what your app uses (`data-testid`, `data-test`, …).
5. **Authentication** — adapt `helpers/app/createStorageState.ts` to your login flow:
    - `createAppStorageState(page)` — UI login, saves the browser session;
    - `setUserAccessToken()` — API login, sets `process.env.ACCESS_TOKEN`.
6. **Page objects and tests** — replace the examples. The easiest way is to ask Claude Code, e.g. _"Create a page object for https://my-app.com/login"_ — the rules make it explore the live page with `playwright-cli` first and follow the project conventions.
7. **API schemas** — replace `fixtures/api/schemas/app/` with Zod schemas built from your API's OpenAPI / Swagger docs.

To add more environments, create `env/.env.<name>` and run with `ENVIRONMENT=<name> npm test` (default: `dev`).

---

## Project Structure

```
├── CLAUDE.md                  # AI Constitution — always loaded by Claude Code
├── .claude/
│   ├── settings.json          # Registers the Constitution enforcement hook
│   ├── scripts/enforce_constitution.py   # Blocks forbidden patterns on write
│   └── skills/                # 16 skills: detailed rules per area
├── config/                    # Config objects (URLs from env)
├── enums/
│   ├── app/                   # App-specific constants (endpoints, routes, messages)
│   └── util/                  # Shared constants (roles)
├── env/.env.example           # Environment template (copy to .env.dev)
├── fixtures/
│   ├── pom/test-options.ts    # Single import point for `test` and `expect`
│   ├── pom/page-object-fixture.ts   # `pm` fixture (PageManager)
│   ├── api/                   # apiRequest fixture + Zod schemas
│   ├── auth/                  # Auto fixtures that keep API tokens fresh
│   └── helper/                # Setup/teardown fixtures
├── helpers/
│   ├── app/                   # Auth bootstrap, global setup
│   └── util/                  # Generic utilities
├── pages/
│   ├── page-manager.ts        # PageManager: access to every page (`pm` fixture)
│   ├── app/                   # Page objects
│   └── components/            # Reusable UI components
├── test-data/
│   ├── factories/             # Faker + Zod factories (valid data)
│   └── static/                # Typed invalid / boundary data sets
├── tests/app/
│   ├── auth.setup.ts          # UI login → saved storage state
│   ├── api/                   # API tests
│   ├── functional/            # Single-feature UI tests
│   └── e2e/                   # Multi-feature user journeys
├── scripts/                   # Skill consistency checks, playwright-cli skill sync
└── playwright.config.ts
```

---

## Running Tests

| Command                    | What it runs                                                   |
| -------------------------- | -------------------------------------------------------------- |
| `npm test`                 | Everything except `@destructive`                               |
| `npm run test:chromium`    | Chromium project                                               |
| `npm run test:admin`       | Chromium admin project (tests under an `admin/` folder)        |
| `npm run test:firefox`     | Firefox project (uncomment it in `playwright.config.ts` first) |
| `npm run test:webkit`      | WebKit project (uncomment it in `playwright.config.ts` first)  |
| `npm run test:api`         | API tests                                                      |
| `npm run test:smoke`       | `@smoke`                                                       |
| `npm run test:regression`  | `@regression`                                                  |
| `npm run test:e2e`         | `@e2e`                                                         |
| `npm run test:destructive` | `@destructive`, one worker                                     |
| `npm run test:ci`          | Chromium, one worker, all tags (for CI pipelines)              |
| `npm run test:ui`          | Playwright UI Mode                                             |
| `npm run test:headed`      | With a visible browser                                         |
| `npm run test:debug`       | Playwright Inspector                                           |
| `npm run report`           | Open the last HTML report                                      |

Other scripts: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run check:skills`, `npm run skills:sync-cli`.

### Tags

Every test has **exactly one** tag, set on the test itself (never on `test.describe`):

| Tag            | Use for                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| `@smoke`       | Critical paths — few tests, run on every build                              |
| `@regression`  | Everything else, one behaviour per test                                     |
| `@e2e`         | Multi-feature user journeys                                                 |
| `@api`         | API contract and schema tests                                               |
| `@destructive` | Mutates **shared** state (settings, roles, flags) — overrides any other tag |

`@functional` and `@sanity` are forbidden.

---

## How It Works

### Test projects

Defined in `playwright.config.ts`:

- **`setup`** — `tests/app/auth.setup.ts` logs in through the UI as the customer and as the admin, saving the sessions to `.auth/app/appStorageState.json` and `.auth/app/adminStorageState.json`.
- **`chromium`** — UI tests; depends on `setup` and starts logged in as the customer.
- **`chromium-admin`** — UI tests under an `admin/` folder; depends on `setup` and starts logged in as the admin.
- **`api`** — tests under `tests/**/api/`; no browser.

### Authentication

- **Browser session** — created once by the `setup` project and reused by UI tests.
- **API tokens** — `helpers/app/global-setup.ts` (Playwright `globalSetup`) logs in via API once, before any worker starts, and sets `process.env.ACCESS_TOKEN` (customer) and `process.env.ADMIN_ACCESS_TOKEN` (admin). They are available in every test and project.
- **Token refresh** — API tokens live 5 minutes. The auto fixtures in `fixtures/auth/token-fixture.ts` re-login in each worker when a token is about to expire (checked from the JWT itself, at worker start and before every test), so long runs never hit expired tokens.
- **Fresh user per test** — the `registeredUser` helper fixture registers a unique user via API, yields it with its token, and deletes it after the test. Use it for anything that changes user state instead of the shared demo accounts.

### Writing a test

```typescript
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('login', () => {
    test(
        'should login with valid credentials',
        { tag: '@smoke' },
        async ({ pm }) => {
            await test.step('Preconditions: the login form is displayed', async () => {
                await pm.loginPage.open();
                await expect(pm.loginPage.loginButton).toBeVisible();
            });

            await test.step('Steps: the user logs in', async () => {
                await pm.loginPage.login(
                    process.env.APP_EMAIL!,
                    process.env.APP_PASSWORD!
                );
            });

            await test.step('Expected: the user menu is visible', async () => {
                await expect(pm.navComponent.userMenu).toBeVisible();
            });
        }
    );
});
```

- Import `test` / `expect` only from `fixtures/pom/test-options.ts`.
- Page objects come from the `pm` fixture (`pm.loginPage`, `pm.homePage`, `pm.navComponent`) — never `new PageObject(page)` in a test.
- New page objects are registered in `pages/page-manager.ts` (a `readonly` field + one line in the constructor). The field name is the class name in camelCase: `CartPage` → `pm.cartPage`, `NavigationComponent` → `pm.navComponent`.

### API test

```typescript
test(
    'should return the current user',
    { tag: '@api' },
    async ({ apiRequest }) => {
        const { status, body } = await apiRequest<CurrentUser>({
            method: 'GET',
            url: ApiEndpoints.CURRENT_USER, // baseUrl defaults to API_URL
            headers: process.env.ACCESS_TOKEN,
        });

        expect(status).toBe(200);
        expect(CurrentUserSchema.parse(body)).toBeTruthy();
    }
);
```

Schemas use `z.strictObject()` and are built from the API documentation.

### Key conventions

| Area         | Rule                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| Locators     | `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId`; no XPath |
| Waits        | Web-first assertions only; never `waitForTimeout`                                       |
| Types        | No `any`; explicit return types on exported functions                                   |
| Constants    | URLs and credentials from `process.env`; endpoints, routes, messages from `enums/`      |
| Test data    | Valid data from factories; invalid data sets in `test-data/static/*.ts` (never JSON)    |
| Cleanup      | Tests that change persistent state revert it in `afterEach` / `afterAll`                |
| Steps        | UI tests: `Preconditions:` → `Steps:` → `Expected:`; API tests: one step per API call   |
| Page objects | Locators and actions only — no `expect`; all assertions live in tests                   |

The full rule set is in [CLAUDE.md](CLAUDE.md).

---

## Working with Claude Code

> **Start Claude Code from the project root** (the folder with `CLAUDE.md` and `.claude/`). If you start it from a parent folder, the project settings are not loaded — the Constitution hook stays silently off and the skills may not be picked up.

Claude Code loads `CLAUDE.md` automatically. It contains the Constitution (MUST / SHOULD / WON'T rules) and an index of the skills in `.claude/skills/`, which Claude reads when working in the matching area.

For any non-trivial task Claude follows the `ai-native-workflow` skill: classify → pick skills → explore → plan with a confidence score → **wait for your approval** → apply → run tests → report.

| Skill                                         | Covers                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| `ai-native-workflow`                          | Entry point: workflow, routing, confidence gate       |
| `page-objects`, `selectors`, `playwright-cli` | Page objects, locator strategy, live-page exploration |
| `test-standards`                              | Spec structure, tags, steps, assertions               |
| `api-testing`, `type-safety`                  | API tests, Zod schemas, TypeScript rules              |
| `fixtures`, `helpers`                         | Fixtures vs plain helpers                             |
| `data-strategy`, `enums`, `config`            | Test data, constants, environment variables           |
| `debugging`                                   | Failure triage, trace viewer, flaky tests             |
| `refactor-values`                             | Safely changing enum values and static data           |
| `common-tasks`                                | Prompt templates and checklists                       |
| `pr-reviewer`                                 | Reviewing a branch against these rules                |

**UI exploration** is done only with Playwright's built-in CLI, `npx playwright cli` (e.g. `npx playwright cli open <url>`, `npx playwright cli snapshot`). It ships with `@playwright/test` and uses the same browser as the tests; its agent skill lives in `.claude/skills/playwright-cli`.

### Quality gates

- **Constitution hook** — `.claude/scripts/enforce_constitution.py` blocks Claude from writing `waitForTimeout`, XPath, `expect` in page objects, `z.object` in schemas, non-type `@playwright/test` imports in specs, JSON static data, forbidden tags, and tags on `describe`.
- **Pre-commit (Husky)** — ESLint + Prettier on staged files; skill consistency checks (`npm run check:skills`) when `.claude/skills/` changes.

When you edit a rule, keep `CLAUDE.md` and the owning skill in sync — `npm run check:skills` fails otherwise.

---

## Updating Dependencies

The lockfile pins the versions the template was verified with. To update a project:

```bash
npm outdated                              # what is out of date
npm update                                # minor / patch updates within package.json ranges
npm install -D @playwright/test@latest    # newest Playwright
npx playwright install chromium           # its browser
npm run skills:sync-cli                   # refresh the playwright-cli skill to match the new Playwright
npm test
```

Update major versions one package at a time and check their changelogs.

---

## Troubleshooting

**Random `apiRequestContext.fetch: Timeout` failures** — the shared demo server is slow under load. Runs use 3 workers locally and the `api` project retries once; lower the load further with `--workers=1`.

**All UI tests are skipped** — the `setup` project failed (wrong credentials or app unreachable). Run `npx playwright test --project=setup` and check `env/.env.dev`.

**The run stops before any test starts with a login error** — the API login in `helpers/app/global-setup.ts` (Playwright `globalSetup`) failed, which blocks every project, UI included. Check `API_URL`, `APP_EMAIL`, `APP_PASSWORD`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `env/.env.dev`.

**`Executable doesn't exist`** — the browser is missing: `npx playwright install chromium` (used by both the tests and `npx playwright cli`).

**`ZodError` in an API test** — the response doesn't match the schema. Compare with the API docs: a mismatch is an app bug to report, not a reason to loosen the schema (see the `api-testing` skill).

**Pre-commit hooks don't run** — the folder wasn't a Git repository during `npm install`. Run `git init && npm install`.

For deeper failure analysis, ask Claude — the `debugging` skill covers trace viewer, UI Mode and flaky tests.

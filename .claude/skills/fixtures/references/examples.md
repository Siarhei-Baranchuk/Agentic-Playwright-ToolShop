# Fixtures — Worked Examples

## Example 1: Register a new page object

User says: _"Make the settings page available to tests."_

Actions:

1. **Phase 1** — New page object → `readonly` field in `pages/page-manager.ts` (no new fixture).
2. **Phase 2** — Confirm the `SettingsPage` class was built after `playwright-cli` exploration and includes feedback/validation locators.
3. **Phase 4** — In `PageManager` add `readonly settingsPage: SettingsPage;` and `this.settingsPage = new SettingsPage(page);` in the constructor.
4. No fixture or `mergeTests()` change — the `pm` fixture already exposes the manager.
5. Consume in tests via `async ({ pm }) => { await pm.settingsPage.open(); }` — never `new SettingsPage(page)` inside a test.

## Example 2: Do NOT create a fixture for a one-off API call

User says: _"Before this test I need to POST to `/api/flags` to enable a feature flag. Should I make a fixture?"_

Actions:

1. **Phase 1** — One-off setup, used by one test → **no fixture**. Call `apiRequest` directly inside `beforeEach` or inline in the test.
2. Promote to a helper fixture **only if** the same POST-to-`/api/flags` setup shows up in 3+ spec files with guaranteed teardown (see `api-testing` Phase 8 rule of thumb).

Result: the test stays self-contained, no fixture creep, no cross-test coupling.

## Example 3: Add a brand-new fixture category

User says: _"Add a `mailbox` fixture that exposes a test inbox for email-verification flows."_

Actions:

1. **Phase 1** — Not a page object, not API setup, not a plain helper → new category.
2. **Phase 3** — Create `fixtures/mailbox/mailbox-fixture.ts` with `export type MailboxFixtures` and `export const test = base.extend<MailboxFixtures>({ ... })`.
3. **Phase 4** — Implement the `mailbox` fixture with the `use()` callback, including teardown that purges the inbox.
4. **Phase 5** — Merge into `fixtures/pom/test-options.ts` via `mergeTests(pageObjectFixture, apiRequestFixture, helperFixture, mailboxFixture)`.
5. Consume in tests via `async ({ mailbox }) => { ... }` — no extra import in the spec file.

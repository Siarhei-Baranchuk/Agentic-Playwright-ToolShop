# Toolshop — Sitemap and Coverage Plan

System under test: **Practice Software Testing — Toolshop v5** (Sprint 5)

| What         | Where                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| UI           | https://practicesoftwaretesting.com (Angular 20)                           |
| API          | https://api.practicesoftwaretesting.com (Laravel 12)                       |
| OpenAPI      | https://api.practicesoftwaretesting.com/docs?api-docs.json                 |
| Requirements | https://testsmith-io.github.io/practice-software-testing/#/user-stories/v5 |

Sources: Angular router routes (extracted from the bundle), a walk through the live site with `npx playwright cli` (guest, `customer@`, `admin@`), the OpenAPI spec, Sprint 5 user stories.

---

## 1. Sitemap (UI)

49 routes. 🔓 — public, 👤 — user login required, 🛡 — admin required.

```
/                                   🔓 Catalog: product grid, search, sorting, filters
│                                      (category tree, brands, eco-friendly), price range, pagination, Compare
├── /product/:id                    🔓 Detail: price/discount, qty ±, Add to cart, Add to favourites,
│                                      Compare, specifications, CO₂ badge, related products; rental → hours slider
├── /category/:slug                 🔓 hand-tools | power-tools | other | special-tools — same grid + filters
├── /rentals                        🔓 Rental products list
├── /comparison                     🔓 Product comparison: table, show differences, remove, clear
├── /contact                        🔓 Form: first/last name/email (guest), subject, message ≥50, .txt attachment
├── /privacy                        🔓 Privacy policy
├── /checkout                       🔓 4-step wizard:
│     1 Cart ─ qty, delete, discounts (combination 15%, eco), totals
│     2 Sign in ─ login (+TOTP) | Continue as Guest (email, first/last name) | "already signed in"
│     3 Billing address ─ country, postal code (+postcode lookup), house number, street, city, state
│     4 Payment ─ Bank Transfer | Cash on Delivery | Credit Card | Buy Now Pay Later | Gift Card → Confirm
├── /auth
│   ├── /login                      🔓 email/password, Sign in with Google, TOTP step, register/forgot links
│   ├── /register                   🔓 11 fields + postcode lookup, password strength indicator
│   └── /forgot-password            🔓 email → Set New Password
├── /account                        👤 Overview + menu (Favorites, Profile, Invoices, Messages)
│   ├── /profile                    👤 Profile (email read-only), change password, 2FA (TOTP) setup
│   ├── /favorites                  👤 List, delete
│   ├── /invoices                   👤 Table + pagination
│   │   └── /:id                    👤 Invoice detail, discounts, Download PDF
│   └── /messages                   👤 Contact messages list
│       └── /:id                    👤 Detail + reply
└── /admin                          🛡
    ├── /dashboard                  🛡 Sales per year chart, latest orders
    ├── /products (+/add, /edit/:id)        🛡 CRUD + search + specs + rental/location offer/CO₂
    ├── /categories (+/add, /edit/:id)      🛡 CRUD + parent + search
    ├── /brands (+/add, /edit/:id)          🛡 CRUD + search
    ├── /orders (+/add, /edit/:id)          🛡 List, search, status change
    ├── /users (+/add, /edit/:id)           🛡 CRUD, enabled, failed login attempts
    ├── /messages (+/:id)                   🛡 List, detail, reply, status
    ├── /settings                           🛡 Payment endpoint, geolocation, CO₂, eco badge, clear storage
    └── /reports
        ├── /statistics                     🛡 Top-10 categories/products, customers and sales per country
        ├── /average-sales-per-month        🛡 Year picker + chart
        └── /average-sales-per-week         🛡 Year picker + chart
```

Present on every page: navbar (Categories dropdown, Contact, Sign in / user menu, cart badge), language selector (DE, EL, EN, ES, FR, NL, TR), chat widget (Find / Order Product, Checkout, Support), live shop activity, footer.

### Differences between the docs and the app (not bugs, but to account for)

| App                                                          | User stories v5                   |
| ------------------------------------------------------------ | --------------------------------- |
| Checkout offers "Continue as Guest"                          | Not described                     |
| Address: House number field + postcode lookup                | Not described                     |
| Languages: DE, **EL**, EN, ES, FR, NL, TR                    | No EL                             |
| Product comparison, specifications, CO₂, eco-friendly filter | Only in the feature matrix, no AC |

### Defect log

| #   | Where                                                                                                                                                                         | What                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/checkout`                                                                                                                                                                   | With an empty cart the page is blank and the console shows `TypeError: Cannot read properties of null (reading 'cart_items')`. AC4 "Checkout – Cart Review" expects "Your shopping cart is empty".                                                                                                                                                |
| 2   | `DELETE /users/{userId}`                                                                                                                                                      | For an already deleted / non-existent user the API returns **500** `No query results for model [App\\Models\\User]` instead of the documented **404**.                                                                                                                                                                                            |
| 3   | `GET /users/{userId}` (admin)                                                                                                                                                 | The body has an undocumented `role` field that `UserResponse` does not declare.                                                                                                                                                                                                                                                                   |
| 4   | `POST /categories`                                                                                                                                                            | A non-existent `parent_id` → **500** `Something went wrong` (DB foreign key error) instead of **404**.                                                                                                                                                                                                                                            |
| 5   | `GET /products/{productId}`                                                                                                                                                   | The body has an undocumented `specs` field that `ProductResponse` does not declare.                                                                                                                                                                                                                                                               |
| 6   | `POST /products`                                                                                                                                                              | `category_id` / `brand_id` of a wrong type or non-existent → **500** (foreign key error) instead of 422 / 404.                                                                                                                                                                                                                                    |
| 7   | `POST /products`                                                                                                                                                              | `co2_rating` is not validated: `123` → **500**, `true` / `null` are stored (201); products with `co2_rating: null` then appear in lists although the contract types it as string.                                                                                                                                                                 |
| 8   | `PUT /products/{productId}`                                                                                                                                                   | `price` is not validated: `"string"` / `null` → **500**, `true` is stored.                                                                                                                                                                                                                                                                        |
| 9   | `PATCH /products/{productId}`                                                                                                                                                 | `co2_rating` is silently ignored (no rule in `PatchProduct`).                                                                                                                                                                                                                                                                                     |
| 10  | `GET /products/{productId}/related`                                                                                                                                           | An unknown `productId` → **500** instead of 404.                                                                                                                                                                                                                                                                                                  |
| 11  | `POST/PUT/PATCH /products`                                                                                                                                                    | `price: "123"` (a string) is accepted although the contract types it as `number`.                                                                                                                                                                                                                                                                 |
| 12  | `GET /products` (pagination)                                                                                                                                                  | For an empty page `from` / `to` are `null`; the contract types them as integer.                                                                                                                                                                                                                                                                   |
| 13  | Inline-validated endpoints: product specs, change-password, TOTP verify, forgot-password, cart add / quantity, invoice status, guest checkout, payment check, postcode lookup | Validation errors answer **404** `Resource not found` instead of 422 / 400.                                                                                                                                                                                                                                                                       |
| 14  | `POST /products/{productId}/specs`                                                                                                                                            | An unknown `productId` → **500** instead of 404.                                                                                                                                                                                                                                                                                                  |
| 15  | `GET/QUERY /users/search`                                                                                                                                                     | Answers a paginated object; the spec documents an array of `UserResponse`.                                                                                                                                                                                                                                                                        |
| 16  | `POST /users/register`                                                                                                                                                        | The email format is not validated — `plaintext` is registered (201).                                                                                                                                                                                                                                                                              |
| 17  | `GET /favorites/{favoriteId}`                                                                                                                                                 | **Security (IDOR):** any user can read another user's favorite.                                                                                                                                                                                                                                                                                   |
| 18  | `DELETE /favorites/{favoriteId}`                                                                                                                                              | Another user's or an unknown favorite answers 204 and silently does nothing (spec: 404).                                                                                                                                                                                                                                                          |
| 19  | `GET /users/refresh`                                                                                                                                                          | Without a (valid) token: **500** HTML error page instead of 401.                                                                                                                                                                                                                                                                                  |
| 20  | `/users/{userId}`                                                                                                                                                             | Error bodies are `{"error": ...}` instead of the documented `{"message": ...}`; PUT/PATCH of an unknown user answer 403 instead of 404.                                                                                                                                                                                                           |
| 21  | `PUT /users/{userId}`                                                                                                                                                         | **Security:** an email taken by another user answers 403 with the raw SQL error (SQLSTATE, table, query, DB host) instead of 409.                                                                                                                                                                                                                 |
| 22  | `GET/QUERY /users/search`                                                                                                                                                     | **Security:** any customer can search all users and read their personal data (email, phone, address); only the admin should.                                                                                                                                                                                                                      |
| 23  | `POST /users/forgot-password`                                                                                                                                                 | **Security:** resets any account's password to one fixed, publicly known value (backend source) — anyone who knows an email can take the account over. No test asserts the value; logged here.                                                                                                                                                    |
| 24  | `POST /users/register`                                                                                                                                                        | The upper age bound (75) is not enforced — both bounds come from one mutated date, the effective limit is 93 years.                                                                                                                                                                                                                               |
| 25  | `POST /users/register`, `GET /reports/customers-by-country`                                                                                                                   | Without an address the user body returns `street` / `city` / `country` = `null` (typed string); the customers report then lists `country: null`.                                                                                                                                                                                                  |
| 26  | `GET /carts/{cartId}`, `PUT /carts/{cartId}/product/quantity`                                                                                                                 | The cart is documented as `{ id }` only — `cart_items`, `lat`, `lng`, `additional_discount_percentage` are undocumented; the quantity update answers `{"result"}` instead of the documented `{"success"}`.                                                                                                                                        |
| 27  | Invoices                                                                                                                                                                      | Undocumented `eco_discount_*` and `payment` fields; invoice lines have `discount_percentage: null` and `discounted_price` as a string; `status_message: null`; a guest invoice has `user_id: null`; `additional_discount_percentage: null` without a discount — all typed number / string in the contract. Blocks schema checks of invoice reads. |
| 28  | `DELETE /carts/{cartId}/product/{productId}`                                                                                                                                  | A product that is not in the cart answers 204 (spec: 404).                                                                                                                                                                                                                                                                                        |
| 29  | `PUT /invoices/{invoiceId}/status`                                                                                                                                            | **Security:** any customer can change the status of any invoice — no role or ownership check.                                                                                                                                                                                                                                                     |
| 30  | Invoice PDF                                                                                                                                                                   | The API offers no way to generate the PDF: the status answers 400 `NOT_INITIATED` (spec: 200, also for unknown numbers instead of 404) and the download 404 `Document not created`. The download has no ownership check in the backend source.                                                                                                    |
| 31  | `POST /payment/check`                                                                                                                                                         | An unknown or missing payment method is reported as `Payment was successful`.                                                                                                                                                                                                                                                                     |
| 32  | `/messages`                                                                                                                                                                   | `POST` answers the stored message instead of the documented `{"success"}`; messages of logged-in users have `name` / `email` = `null`; the detail carries undocumented `user` / `replies`; `ON_HOLD` is a documented status but is rejected.                                                                                                      |
| 33  | `/messages`                                                                                                                                                                   | Another user's or an unknown message answers 200 `[]` instead of 404; `attach-file` does not check that the message exists.                                                                                                                                                                                                                       |
| 34  | `/messages/{messageId}/reply`, `/status`                                                                                                                                      | **Security:** any logged-in user can reply to, or change the status of, any other user's message.                                                                                                                                                                                                                                                 |

Non-blocking spec differences (tests follow the actual behaviour or are skipped): `POST /products` answers 201 (spec: 200); catalog `DELETE` returns 403 for a non-admin (not in the spec); `GET /products/{id}/specs` for an unknown product returns `200 []`; `DELETE` of an unknown spec returns 204; the documented 404 for whole lists and 422 for `DELETE` cannot be reproduced. Security observation: any logged-in customer can create, update and delete product specs (`auth:users` only, no admin role).

---

## 2. API map

88 operations, 311 documented status codes, 70 path/query parameters, 134 request body fields, 33 schemas.

| Group        | Operations | Endpoints                                                                                      | Auth      |
| ------------ | ---------: | ---------------------------------------------------------------------------------------------- | --------- |
| Product      |         10 | `/products` GET/POST/QUERY, `/{id}` GET/PUT/PATCH/DELETE, `/{id}/related`, `/search` GET/QUERY | DELETE 🛡  |
| Product Spec |          6 | `/products/{id}/specs` CRUD, `/product-specs/names`                                            | writes 👤 |
| Category     |         10 | `/categories` CRUD, `/tree`, `/tree/{id}`, `/search` (GET/QUERY)                               | DELETE 🛡  |
| Brand        |          8 | `/brands` CRUD, `/search` (GET/QUERY)                                                          | DELETE 🛡  |
| Image        |          1 | `/images`                                                                                      | —         |
| User         |         14 | register, login, logout, refresh, me, forgot/change-password, `/users` CRUD, search            | 👤 / 🛡    |
| TOTP         |          2 | `/totp/setup`, `/totp/verify`                                                                  | 👤        |
| Favorite     |          4 | `/favorites` CRUD                                                                              | 👤        |
| Cart         |          6 | `/carts` create/add/get/delete, qty update, remove product                                     | —         |
| Invoice      |         11 | `/invoices` CRUD, `/guest`, status, search, `download-pdf`, `download-pdf-status`              | 👤 / 🛡    |
| Payment      |          1 | `/payment/check`                                                                               | —         |
| Contact      |          6 | `/messages` list/create/get, attach-file, reply, status                                        | 👤 / 🛡    |
| Report       |          7 | `/reports/*`                                                                                   | 🛡         |
| Postcode     |          1 | `/postcode-lookup`                                                                             | —         |
| Stream       |          1 | `/sales-stream` (SSE)                                                                          | —         |

---

## 3. Strategy

### Users and data isolation

- The site is public and shared: other people use the same `customer@` and `admin@` accounts, and the data is reset every hour.
- **`customer@`** — read-only checks only (does the account open, are there invoices).
- **A fresh user per test** — anything that changes user state (profile, password, favorites, locking, TOTP, disable). Created via `POST /users/register` in a helper fixture, deleted via `DELETE /users/{id}` (admin) in teardown.
- **`admin@`** — admin API and admin UI. Tests create and delete only their own entities (product, category, brand); seeded entities are never edited. That is why `@destructive` is not needed: every test owns an isolated entity.
- `/admin/settings` values live in the browser's `localStorage`, so they are not shared globally.
- The API access token (JWT) lives 5 minutes.

### Tags

| Tag           | What                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `@smoke`      | ~15 critical: login, search, product detail, add to cart, guest checkout, admin login |
| `@regression` | All other functional UI tests                                                         |
| `@e2e`        | End-to-end user journeys                                                              |
| `@api`        | All API tests                                                                         |

### API completeness rules (from `api-testing`)

- Every status code in the OpenAPI spec has its own test. When behaviour differs from the spec: `test.skip` + `// FIXME:`, the schema is never loosened.
- Negative coverage is risk-based — one test per validation branch, never a second value for the same branch:
    - POST: empty body, each required field missing, a `for...of` loop per field over the minimal `INVALID_*` sets (wrong type + `null`), length / format boundaries.
    - PUT / PATCH: one partial-update test and one `PRIMARY_INVALID_VALUES` test per field.
    - Path parameters: `INVALID_PATH_IDS` (non-existent id + malformed id).
- Responses are validated with `z.strictObject` schemas built from `components.schemas`.
- `QUERY` variants (`/products`, `/search`, `/tree`) get their own tests, including `415`.

---

## 4. Page objects

Layout: `pages/app/{shop,auth,account,checkout,admin}/` + `pages/components/`. All registered in `PageManager`.

### Components (`pages/components/`)

| Component                          | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `navigation.component.ts` (exists) | + Categories dropdown, user menu, cart badge, language |
| `product-filters.component.ts`     | Search, sorting, price range, categories, brands, eco  |
| `product-grid.component.ts`        | Cards: name, price, discount, out of stock, CO₂; click |
| `pagination.component.ts`          | Used by the catalog, invoices, admin lists             |
| `comparison-bar.component.ts`      | Comparison bar                                         |
| `chat-widget.component.ts`         | Chat: menu and 4 flows                                 |
| `account-menu.component.ts`        | Account menu                                           |
| `admin-menu.component.ts`          | Admin menu + Reports                                   |
| `admin-search.component.ts`        | Search/reset in admin lists                            |

### Pages

| Area     | Page objects                                                                                                                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shop     | `home` (exists), `product-detail`, `category`, `rentals`, `comparison`, `contact`, `privacy`                                                                                                                                                                                                                                      |
| auth     | `login` (exists), `register`, `forgot-password`                                                                                                                                                                                                                                                                                   |
| account  | `account-overview`, `profile`, `favorites`, `invoices`, `invoice-detail`, `messages`, `message-detail`                                                                                                                                                                                                                            |
| checkout | `checkout` + step components `cart-step`, `sign-in-step`, `billing-address-step`, `payment-step`                                                                                                                                                                                                                                  |
| admin    | `admin-dashboard`, `admin-products`, `admin-product-form`, `admin-categories`, `admin-category-form`, `admin-brands`, `admin-brand-form`, `admin-orders`, `admin-order-form`, `admin-users`, `admin-user-form`, `admin-messages`, `admin-message-detail`, `admin-settings`, `admin-statistics`, `admin-sales-report` (month/week) |

Total ≈ 9 components and 33 pages.

---

## 5. Test plan

### 5.1 UI — functional (`tests/app/functional/`)

| Spec                        | Scenarios (AC from the user stories)                                                                                                                                       |   ≈ |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --: |
| `product-overview.spec.ts`  | Grid; open detail; pagination; search (+ no results, reset); sorting ×4; category filter, parent/child hierarchy; brand; combined; eco-friendly; price range; out of stock |  18 |
| `category.spec.ts`          | Each of 4 categories: title, category products, filters available                                                                                                          |   5 |
| `product-detail.spec.ts`    | Info, badges; qty +/−/min 1/manual entry/clamp; add to cart + cart badge; out of stock; specifications; related                                                            |  10 |
| `favorites-guest.spec.ts`   | Add to favourites without login → Unauthorized                                                                                                                             |   1 |
| `rentals.spec.ts`           | List; rental detail: 1–10 h slider, price calculation; rental label in cart                                                                                                |   4 |
| `comparison.spec.ts`        | Empty; add 2–3 products; show differences; remove; clear                                                                                                                   |   5 |
| `contact.spec.ts`           | Guest: required fields + errors; subject ×6; message < 50; .txt 0 KB ok; non-.txt; non-empty file; success; logged in: auto-fill                                           |  10 |
| `login.spec.ts` (exists)    | + role-based redirect (account/admin); locking after 3 failures (own user); disabled user; invalid TOTP; Google button opens a popup                                       |  +6 |
| `register.spec.ts`          | Required fields; password hints and strength ×5 levels; duplicate email; postcode lookup; success → login                                                                  |  10 |
| `forgot-password.spec.ts`   | Form; invalid email; unregistered email; success                                                                                                                           |   4 |
| `profile.spec.ts`           | Data; email read-only; update; required fields                                                                                                                             |   4 |
| `change-password.spec.ts`   | Mismatch; wrong current; new = current; strength; success → logout                                                                                                         |   5 |
| `two-factor.spec.ts`        | Denied for demo accounts; QR + secret; invalid code; success; login with TOTP                                                                                              |   5 |
| `favorites.spec.ts`         | Empty; add; duplicate; delete                                                                                                                                              |   4 |
| `invoices.spec.ts`          | List + pagination; detail; not found; discounts; Download PDF                                                                                                              |   5 |
| `messages.spec.ts`          | List; detail; reply                                                                                                                                                        |   3 |
| `checkout-cart.spec.ts`     | Table; qty update + recalculation; delete; 15% combination discount and its removal; Continue shopping                                                                     |   6 |
| `checkout-sign-in.spec.ts`  | Login in the wizard; guest; already signed in; guest validation                                                                                                            |   4 |
| `checkout-address.spec.ts`  | Pre-fill; validation → Proceed disabled; postcode lookup                                                                                                                   |   3 |
| `checkout-payment.spec.ts`  | Fields ×5 methods; validation (card format, past expiry, CVV); BNPL installments; switching method resets the form                                                         |   9 |
| `language.spec.ts`          | Switch ×7; persisted in localStorage; browser language detection; EN fallback                                                                                              |   4 |
| `geo-discount.spec.ts`      | Geolocation (Playwright `geolocation`) ×5 cities → discount; no match                                                                                                      |   6 |
| `chat-widget.spec.ts`       | Menu; Find Product; Order Product; Checkout with an empty cart; Support                                                                                                    |   5 |
| `navigation.spec.ts`        | Navbar and footer links; privacy                                                                                                                                           |   3 |
| `admin-*.spec.ts` (8 files) | Dashboard; product/category/brand CRUD (own entities) + search + validation; order status change; user CRUD, disable/enable; messages reply, status; settings; reports ×3  |  30 |

**UI functional ≈ 170 tests.**

### 5.2 UI — E2E (`tests/app/e2e/`)

| Journey                                                                              |
| ------------------------------------------------------------------------------------ |
| Guest: search → detail → cart → guest checkout → payment ×5 methods → invoice number |
| New user: register → login → purchase → invoice in `/account/invoices`               |
| Rental + regular product → combination discount → invoice with 15% discount          |
| Contact form (user) → admin replies → user sees the reply                            |
| Admin creates a product → visible in catalog and search → admin deletes → gone       |
| Admin disables a user → login "Account disabled." → enables → login works            |

**E2E ≈ 10 tests.**

### 5.3 API (`tests/app/api/`)

One spec per group: `products`, `product-specs`, `categories`, `brands`, `images`, `users`, `auth` (login/logout/refresh/me/forgot/change-password), `totp`, `favorites`, `carts`, `invoices`, `payment`, `messages`, `reports`, `postcode`, `sales-stream`.

**API ≈ 480 tests** (risk-based negative coverage; the full per-value matrix would be ≈ 550–600).

---

## 6. Infrastructure changes

| What                                                                                                                                           | Why                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                                                         | Admin API and admin UI                |
| `global-setup`: `ADMIN_ACCESS_TOKEN`                                                                                                           | Admin token next to `ACCESS_TOKEN`    |
| `auth.setup.ts`: `adminStorageState`, `chromium-admin` project                                                                                 | Admin UI tests start logged in        |
| `apiRequest`: `QUERY` method, query params, multipart, binary responses                                                                        | `QUERY` endpoints, `attach-file`, PDF |
| Helper fixtures: `registeredUser`, `adminProduct`, `adminCategory`, `adminBrand`, `cartWithItems`, `paidInvoice`                               | Setup/teardown via API                |
| Factories: user, address, product, category, brand, contact message, payment details (×5)                                                      | Faker data for happy paths            |
| Static: invalid email/password/card/postcode, attachment files                                                                                 | Negative data sets                    |
| Enums: `AppRoutes` (49), `ApiEndpoints` (88), `Messages` (~40), `PaymentMethods`, `ContactSubjects`, `OrderStatuses`, `Languages`, `GeoCities` | No hardcoded strings                  |
| Zod schemas: 33 from OpenAPI                                                                                                                   | Response validation                   |
| `otpauth` dependency (dev)                                                                                                                     | TOTP code generation                  |

---

## 7. Work order (iterations)

Each iteration ends with its tests, lint and tsc green, plus a report. The next iteration starts only after confirmation.

The estimate is agent working time (explore → code → run → debug), without review time between iterations. The main schedule risk is API behaviour that differs from the spec and the instability of the shared public environment: 20–30 % is reserved for debugging.

| Iteration | Scope                                                                                                 | Operations / screens |  Tests ≈ |      Estimate |
| --------- | ----------------------------------------------------------------------------------------------------- | -------------------: | -------: | ------------: |
| 0         | Infrastructure: env, enums, admin auth, `apiRequest` extensions, base factories and helper fixtures   |                    — |        — |       0.5–1 h |
| 1         | API: catalog (products, specs, categories, brands, images)                                            |               35 ops |      243 |         3–4 h |
| 2         | API: users, auth, totp, favorites                                                                     |               20 ops |     ~100 |         2–3 h |
| 3         | API: carts, invoices, payment, messages, reports, postcode, sales-stream                              |               33 ops |     ~140 |         3–4 h |
| 4         | UI: shop (catalog, filters, detail, categories, rentals, comparison, contact, navigation, language)   |            9 screens |      ~60 |         3–4 h |
| 5         | UI: auth and account (register, login, forgot, profile, password, 2FA, favorites, invoices, messages) |           10 screens |      ~50 |         3–4 h |
| 6         | UI: checkout + geo/combination discount + chat + E2E                                                  |       4 steps + chat |      ~40 |         3–4 h |
| 7         | UI: admin                                                                                             |           16 screens |      ~30 |         3–4 h |
|           | **Total**                                                                                             |                      | **~660** | **≈ 20–28 h** |

Expected full-suite run time locally (3 workers): API ≈ 1.5–2 min, UI ≈ 12–18 min.

### Status

| Iteration | Result                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0         | Done                                                                                                                                                                                                                                                                                 |
| 1         | Done — 243 API tests for 35 operations (reduced from 396 by the risk-based negative model): 195 passing, 48 skipped with FIXME; every defect #4–#14 still has a test                                                                                                                 |
| 2         | Done — 158 API tests for 20 operations (users, auth, TOTP, favorites): 115 passing, 43 skipped with FIXME; defects #15–#25 logged                                                                                                                                                    |
| 3         | Done — 224 API tests for 33 operations (carts, invoices, payment, messages, reports, postcode, sales stream): 153 passing, 71 skipped with FIXME; business rules checked: 15% combination discount, 5% eco discount, location discounts, all payment methods; defects #26–#34 logged |

---

## 8. Out of scope

- Real Google sign-in: only the button and the popup opening are checked.
- Email delivery (registration, order, contact): no mailbox available.
- PDF content: generation status, download and file type are checked.
- Versions v1–v4, `with-bugs`, performance, GraphQL, the mobile app.
- Visual and load testing.

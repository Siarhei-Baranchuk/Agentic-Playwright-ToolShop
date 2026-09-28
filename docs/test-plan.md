# Toolshop — карта сайта и план покрытия

Объект тестирования: **Practice Software Testing — Toolshop v5** (Sprint 5)

| Что        | Где                                                                        |
| ---------- | -------------------------------------------------------------------------- |
| UI         | https://practicesoftwaretesting.com (Angular 20)                           |
| API        | https://api.practicesoftwaretesting.com (Laravel 12)                       |
| OpenAPI    | https://api.practicesoftwaretesting.com/docs?api-docs.json                 |
| Требования | https://testsmith-io.github.io/practice-software-testing/#/user-stories/v5 |

Источники карты: маршруты Angular-роутера (извлечены из бандла), обход живого сайта через `npx playwright cli` (гость, `customer@`, `admin@`), OpenAPI-спека, user stories Sprint 5.

---

## 1. Карта сайта (UI)

49 маршрутов. 🔓 — публичный, 👤 — нужен логин пользователя, 🛡 — нужен админ.

```
/                                   🔓 Каталог: сетка товаров, поиск, сортировка, фильтры
│                                      (категории-дерево, бренды, eco-friendly), price range, пагинация, Compare
├── /product/:id                    🔓 Карточка: цена/скидка, qty ±, Add to cart, Add to favourites,
│                                      Compare, спецификации, CO₂-бейдж, related products; rental → слайдер часов
├── /category/:slug                 🔓 hand-tools | power-tools | other | special-tools — та же сетка + фильтры
├── /rentals                        🔓 Список товаров в аренду
├── /comparison                     🔓 Сравнение товаров: таблица, show differences, remove, clear
├── /contact                        🔓 Форма: имя/фамилия/email (гость), subject, message ≥50, .txt-вложение
├── /privacy                        🔓 Политика конфиденциальности
├── /checkout                       🔓 Мастер из 4 шагов:
│     1 Cart ─ qty, delete, скидки (combination 15%, eco), totals
│     2 Sign in ─ логин (+TOTP) | Continue as Guest (email, имя, фамилия) | "already signed in"
│     3 Billing address ─ country, postal code (+postcode lookup), house number, street, city, state
│     4 Payment ─ Bank Transfer | Cash on Delivery | Credit Card | Buy Now Pay Later | Gift Card → Confirm
├── /auth
│   ├── /login                      🔓 email/password, Sign in with Google, TOTP-шаг, ссылки register/forgot
│   ├── /register                   🔓 11 полей + postcode lookup, индикатор силы пароля
│   └── /forgot-password            🔓 email → Set New Password
├── /account                        👤 Overview + меню (Favorites, Profile, Invoices, Messages)
│   ├── /profile                    👤 Профиль (email read-only), смена пароля, настройка 2FA (TOTP)
│   ├── /favorites                  👤 Список, удаление
│   ├── /invoices                   👤 Таблица + пагинация
│   │   └── /:id                    👤 Детали счёта, скидки, Download PDF
│   └── /messages                   👤 Список обращений
│       └── /:id                    👤 Детали + ответ
└── /admin                          🛡
    ├── /dashboard                  🛡 График продаж по годам, последние заказы
    ├── /products (+/add, /edit/:id)        🛡 CRUD + поиск + specs + rental/location offer/CO₂
    ├── /categories (+/add, /edit/:id)      🛡 CRUD + parent + поиск
    ├── /brands (+/add, /edit/:id)          🛡 CRUD + поиск
    ├── /orders (+/add, /edit/:id)          🛡 Список, поиск, смена статуса
    ├── /users (+/add, /edit/:id)           🛡 CRUD, enabled, failed login attempts
    ├── /messages (+/:id)                   🛡 Список, детали, ответ, статус
    ├── /settings                           🛡 Payment endpoint, geolocation, CO₂, eco-badge, clear storage
    └── /reports
        ├── /statistics                     🛡 Top-10 категорий/товаров, клиенты и продажи по странам
        ├── /average-sales-per-month        🛡 Выбор года + график
        └── /average-sales-per-week         🛡 Выбор года + график
```

Сквозные элементы на всех страницах: навбар (Categories dropdown, Contact, Sign in / user menu, бейдж корзины), выбор языка (DE, EL, EN, ES, FR, NL, TR), чат-виджет (Find / Order Product, Checkout, Support), live shop activity, футер.

### Расхождения документации и приложения (не баги, но учесть)

| Приложение                                                | User stories v5                   |
| --------------------------------------------------------- | --------------------------------- |
| В checkout есть «Continue as Guest»                       | Не описано                        |
| Адрес: поле House number + автоподстановка по индексу     | Не описано                        |
| Языки: DE, **EL**, EN, ES, FR, NL, TR                     | Без EL                            |
| Сравнение товаров, спецификации, CO₂, eco-friendly фильтр | Только в матрице features, без AC |

### Найденные дефекты

| #   | Где                           | Что                                                                                                                                                                                         |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/checkout`                   | С пустой корзиной страница пустая, в консоли `TypeError: Cannot read properties of null (reading 'cart_items')`. По AC4 «Checkout – Cart Review» должно быть «Your shopping cart is empty». |
| 2   | `DELETE /users/{userId}`      | Для уже удалённого/несуществующего пользователя API возвращает **500** `No query results for model [App\\Models\\User]` вместо задокументированного **404**.                                |
| 3   | `GET /users/{userId}` (admin) | В ответе недокументированное поле `role` — отсутствует в контракте `UserResponse`.                                                                                                          |

---

## 2. Карта API

88 операций, 311 задокументированных статус-кодов, 70 параметров пути/query, 134 поля тел запросов, 33 схемы.

| Группа       | Операций | Эндпоинты                                                                                      | Auth     |
| ------------ | -------: | ---------------------------------------------------------------------------------------------- | -------- |
| Product      |       10 | `/products` GET/POST/QUERY, `/{id}` GET/PUT/PATCH/DELETE, `/{id}/related`, `/search` GET/QUERY | DELETE 🛡 |
| Product Spec |        6 | `/products/{id}/specs` CRUD, `/product-specs/names`                                            | запись 🛡 |
| Category     |       10 | `/categories` CRUD, `/tree`, `/tree/{id}`, `/search` (GET/QUERY)                               | DELETE 🛡 |
| Brand        |        8 | `/brands` CRUD, `/search` (GET/QUERY)                                                          | DELETE 🛡 |
| Image        |        1 | `/images`                                                                                      | —        |
| User         |       14 | register, login, logout, refresh, me, forgot/change-password, `/users` CRUD, search            | 👤 / 🛡   |
| TOTP         |        2 | `/totp/setup`, `/totp/verify`                                                                  | 👤       |
| Favorite     |        4 | `/favorites` CRUD                                                                              | 👤       |
| Cart         |        6 | `/carts` create/add/get/delete, qty update, remove product                                     | —        |
| Invoice      |       11 | `/invoices` CRUD, `/guest`, status, search, `download-pdf`, `download-pdf-status`              | 👤 / 🛡   |
| Payment      |        1 | `/payment/check`                                                                               | —        |
| Contact      |        6 | `/messages` list/create/get, attach-file, reply, status                                        | 👤 / 🛡   |
| Report       |        7 | `/reports/*`                                                                                   | 🛡        |
| Postcode     |        1 | `/postcode-lookup`                                                                             | —        |
| Stream       |        1 | `/sales-stream` (SSE)                                                                          | —        |

---

## 3. Стратегия

### Пользователи и изоляция данных

- Сайт публичный и общий: чужие пользователи работают с теми же `customer@` и `admin@`, данные сбрасываются раз в час.
- **`customer@`** — только для read-only проверок (есть ли счета, открывается ли кабинет).
- **Свой пользователь на тест** — всё, что меняет состояние пользователя (профиль, пароль, избранное, блокировка, TOTP, disable). Создаётся через `POST /users/register` в helper-фикстуре, удаляется через `DELETE /users/{id}` (админ) в teardown.
- **`admin@`** — для админ-API и админ-UI. Создаём только свои сущности (товар, категория, бренд), удаляем в `afterEach`. Сидовые сущности не редактируем. Поэтому `@destructive` не понадобится: у каждого теста своя изолированная сущность.
- Настройки `/admin/settings` хранятся в `localStorage` браузера, то есть глобально не шарятся.

### Теги

| Тег           | Что                                                                             |
| ------------- | ------------------------------------------------------------------------------- |
| `@smoke`      | ~15 критичных: логин, поиск, карточка, add to cart, guest checkout, admin логин |
| `@regression` | Остальные функциональные UI-тесты                                               |
| `@e2e`        | Сквозные пользовательские сценарии                                              |
| `@api`        | Все API-тесты                                                                   |

### API: правила полноты (из `api-testing`)

- Каждый статус-код из OpenAPI — отдельный тест. Если поведение не совпадает со спекой: `test.skip` + `// FIXME:`, схему не ослабляем.
- Каждое поле тела запроса: цикл «поле отсутствует» + цикл «неверный тип».
- Ответы — `z.strictObject` по схемам из `components.schemas`.
- `QUERY`-варианты (`/products`, `/search`, `/tree`) — отдельные тесты, включая `415`.

---

## 4. Page objects

Раскладка: `pages/app/{shop,auth,account,checkout,admin}/` + `pages/components/`. Все регистрируются в `PageManager`.

### Компоненты (`pages/components/`)

| Компонент                        | Назначение                                             |
| -------------------------------- | ------------------------------------------------------ |
| `navigation.component.ts` (есть) | + Categories dropdown, user menu, бейдж корзины, язык  |
| `product-filters.component.ts`   | Поиск, сортировка, price range, категории, бренды, eco |
| `product-grid.component.ts`      | Карточки: имя, цена, скидка, out of stock, CO₂; клик   |
| `pagination.component.ts`        | Используется в каталоге, счетах, админ-списках         |
| `comparison-bar.component.ts`    | Плашка сравнения                                       |
| `chat-widget.component.ts`       | Чат: меню и 4 сценария                                 |
| `account-menu.component.ts`      | Меню кабинета                                          |
| `admin-menu.component.ts`        | Меню админки + Reports                                 |
| `admin-search.component.ts`      | Поиск/сброс в админ-списках                            |

### Страницы

| Раздел   | Page objects                                                                                                                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shop     | `home` (есть), `product-detail`, `category`, `rentals`, `comparison`, `contact`, `privacy`                                                                                                                                                                                                                                        |
| auth     | `login` (есть), `register`, `forgot-password`                                                                                                                                                                                                                                                                                     |
| account  | `account-overview`, `profile`, `favorites`, `invoices`, `invoice-detail`, `messages`, `message-detail`                                                                                                                                                                                                                            |
| checkout | `checkout` + шаги-компоненты `cart-step`, `sign-in-step`, `billing-address-step`, `payment-step`                                                                                                                                                                                                                                  |
| admin    | `admin-dashboard`, `admin-products`, `admin-product-form`, `admin-categories`, `admin-category-form`, `admin-brands`, `admin-brand-form`, `admin-orders`, `admin-order-form`, `admin-users`, `admin-user-form`, `admin-messages`, `admin-message-detail`, `admin-settings`, `admin-statistics`, `admin-sales-report` (month/week) |

Итого ≈ 9 компонентов и 33 страницы.

---

## 5. Тест-план

### 5.1 UI — функциональные (`tests/app/functional/`)

| Spec                         | Сценарии (AC из user stories)                                                                                                                                                         |   ≈ |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --: |
| `product-overview.spec.ts`   | Сетка; переход в карточку; пагинация; поиск (+ no results, reset); сортировка ×4; фильтр категории, иерархия parent/child; бренд; комбинация; eco-friendly; price range; out of stock |  18 |
| `category.spec.ts`           | Каждая из 4 категорий: заголовок, товары категории, фильтры доступны                                                                                                                  |   5 |
| `product-detail.spec.ts`     | Инфо, бейджи; qty +/−/мин 1/ручной ввод/clamp; add to cart + бейдж корзины; out of stock; спецификации; related                                                                       |  10 |
| `favorites-guest.spec.ts`    | Add to favourites без логина → Unauthorized                                                                                                                                           |   1 |
| `rentals.spec.ts`            | Список; карточка аренды: слайдер 1–10 ч, расчёт цены; метка rental в корзине                                                                                                          |   4 |
| `comparison.spec.ts`         | Пусто; добавить 2–3 товара; show differences; remove; clear                                                                                                                           |   5 |
| `contact.spec.ts`            | Гость: обязательные поля + ошибки; subject ×6; message < 50; .txt 0 KB ок; не-.txt; не пустой файл; успех; залогиненный: автозаполнение                                               |  10 |
| `login.spec.ts` (есть)       | + редирект по роли (account/admin); блокировка после 3 ошибок (свой user); disabled user; TOTP неверный; Google-кнопка открывает popup                                                |  +6 |
| `register.spec.ts`           | Обязательные поля; подсказки и сила пароля ×5 уровней; duplicate email; postcode lookup; успех → login                                                                                |  10 |
| `forgot-password.spec.ts`    | Форма; невалидный email; незарегистрированный; успех                                                                                                                                  |   4 |
| `profile.spec.ts`            | Данные; email read-only; обновление; обязательные поля                                                                                                                                |   4 |
| `change-password.spec.ts`    | Не совпадают; неверный текущий; новый = текущий; сила; успех → logout                                                                                                                 |   5 |
| `two-factor.spec.ts`         | Запрет для demo-аккаунтов; QR + secret; неверный код; успех; логин с TOTP                                                                                                             |   5 |
| `favorites.spec.ts`          | Пусто; добавить; дубликат; удалить                                                                                                                                                    |   4 |
| `invoices.spec.ts`           | Список + пагинация; детали; not found; скидки; Download PDF                                                                                                                           |   5 |
| `messages.spec.ts`           | Список; детали; ответ                                                                                                                                                                 |   3 |
| `checkout-cart.spec.ts`      | Таблица; qty update + пересчёт; удаление; combination discount 15% и его снятие; Continue shopping                                                                                    |   6 |
| `checkout-sign-in.spec.ts`   | Логин в мастере; гость; already signed in; валидация гостя                                                                                                                            |   4 |
| `checkout-address.spec.ts`   | Предзаполнение; валидация → Proceed disabled; postcode lookup                                                                                                                         |   3 |
| `checkout-payment.spec.ts`   | Поля ×5 методов; валидации (card формат, срок в прошлом, CVV); BNPL рассрочки; смена метода сбрасывает форму                                                                          |   9 |
| `language.spec.ts`           | Переключение ×7; сохранение в localStorage; детект языка браузера; fallback EN                                                                                                        |   4 |
| `geo-discount.spec.ts`       | Геолокация (Playwright `geolocation`) ×5 городов → скидка; нет совпадения                                                                                                             |   6 |
| `chat-widget.spec.ts`        | Меню; Find Product; Order Product; Checkout с пустой корзиной; Support                                                                                                                |   5 |
| `navigation.spec.ts`         | Ссылки навбара и футера; privacy                                                                                                                                                      |   3 |
| `admin-*.spec.ts` (8 файлов) | Dashboard; CRUD товара/категории/бренда (свои сущности) + поиск + валидации; заказ: смена статуса; пользователь: CRUD, disable/enable; сообщения: ответ, статус; settings; отчёты ×3  |  30 |

**UI функциональные ≈ 170 тестов.**

### 5.2 UI — E2E (`tests/app/e2e/`)

| Journey                                                                              |
| ------------------------------------------------------------------------------------ |
| Гость: поиск → карточка → корзина → guest checkout → оплата ×5 методов → номер счёта |
| Новый пользователь: регистрация → логин → покупка → счёт в `/account/invoices`       |
| Аренда + обычный товар → combination discount → счёт со скидкой 15%                  |
| Контакт-форма (пользователь) → админ отвечает → пользователь видит ответ             |
| Админ создаёт товар → виден в каталоге и поиске → админ удаляет → исчез              |
| Админ отключает пользователя → логин «Account disabled.» → включает → логин ок       |

**E2E ≈ 10 тестов.**

### 5.3 API (`tests/app/api/`)

По одному spec на группу: `products`, `product-specs`, `categories`, `brands`, `images`, `users`, `auth` (login/logout/refresh/me/forgot/change-password), `totp`, `favorites`, `carts`, `invoices`, `payment`, `messages`, `reports`, `postcode`, `sales-stream`.

**API ≈ 311 тестов на статус-коды + ≈ 270 параметризованных негативных кейсов по полям ≈ 550–600.**

---

## 6. Изменения инфраструктуры

| Что                                                                                                                                            | Зачем                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                                                         | Админ-API и админ-UI                    |
| `global-setup`: `ADMIN_ACCESS_TOKEN`                                                                                                           | Токен админа рядом с `ACCESS_TOKEN`     |
| `auth.setup.ts`: `adminStorageState`, проект `chromium-admin`                                                                                  | UI-тесты админки стартуют залогиненными |
| `apiRequest`: метод `QUERY`, query-параметры, multipart, бинарный ответ                                                                        | `QUERY`-эндпоинты, `attach-file`, PDF   |
| Helper-фикстуры: `registeredUser`, `adminProduct`, `adminCategory`, `adminBrand`, `cartWithItems`, `paidInvoice`                               | Setup/teardown через API                |
| Фабрики: user, address, product, category, brand, contact message, payment details (×5)                                                        | Faker-данные для happy path             |
| Static: invalid email/password/card/postcode, файлы для вложений                                                                               | Негативные наборы                       |
| Enums: `AppRoutes` (49), `ApiEndpoints` (88), `Messages` (~40), `PaymentMethods`, `ContactSubjects`, `OrderStatuses`, `Languages`, `GeoCities` | Никаких захардкоженных строк            |
| Zod-схемы: 33 из OpenAPI                                                                                                                       | Валидация ответов                       |
| Зависимость `otpauth` (dev)                                                                                                                    | Генерация TOTP-кодов                    |

---

## 7. Порядок работ (волны)

Каждая волна закрывается прогоном её тестов, lint и tsc «в зелёное» и отчётом. Следующая волна стартует только после подтверждения.

Оценка — рабочее время агента (разведка → код → прогон → отладка), без ожидания ревью между волнами. Главный риск по срокам — расхождения API со спекой и нестабильность общего публичного стенда: на отладку заложено 20–30 %.

| Волна | Содержание                                                                                                 | Операций / экранов | Тестов ≈ |        Оценка |
| ----- | ---------------------------------------------------------------------------------------------------------- | -----------------: | -------: | ------------: |
| 0     | Инфраструктура: env, enums, admin-auth, доработка `apiRequest`, базовые фабрики и helper-фикстуры          |                  — |        — |       0,5–1 ч |
| 1     | API: каталог (products, specs, categories, brands, images)                                                 |             35 оп. |     ~230 |         3–4 ч |
| 2     | API: users, auth, totp, favorites                                                                          |             20 оп. |     ~150 |         2–3 ч |
| 3     | API: carts, invoices, payment, messages, reports, postcode, sales-stream                                   |             33 оп. |     ~200 |         3–4 ч |
| 4     | UI: витрина (каталог, фильтры, карточка, категории, аренда, сравнение, контакт, навигация, язык)           |          9 экранов |      ~60 |         3–4 ч |
| 5     | UI: авторизация и кабинет (register, login, forgot, profile, password, 2FA, favorites, invoices, messages) |         10 экранов |      ~50 |         3–4 ч |
| 6     | UI: checkout + geo/combination discount + чат + E2E                                                        |       4 шага + чат |      ~40 |         3–4 ч |
| 7     | UI: админка                                                                                                |         16 экранов |      ~30 |         3–4 ч |
|       | **Итого**                                                                                                  |                    | **~750** | **≈ 20–28 ч** |

Ожидаемое время прогона всего набора локально (5 воркеров): API ≈ 3–5 мин, UI ≈ 10–15 мин.

---

## 8. Вне скоупа

- Реальный вход через Google: проверяем только кнопку и открытие popup.
- Доставка писем (регистрация, заказ, контакт): почтового ящика нет.
- Содержимое PDF: проверяем статус генерации, скачивание и тип файла.
- Версии v1–v4, `with-bugs`, performance, GraphQL, мобильное приложение.
- Визуальные и нагрузочные тесты.

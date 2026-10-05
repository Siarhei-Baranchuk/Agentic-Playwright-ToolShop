/**
 * Application-specific constants.
 * Add your application's repeated string values here.
 *
 * Paths with parameters keep the placeholder from their source — `:id` for
 * UI routes (Angular router), `{productId}` for API endpoints (OpenAPI) —
 * and are filled with `fillPath` from `helpers/util/util.ts`.
 *
 * @example
 * ```ts
 * // In a page object — tests then assert on the locator via `pm`
 * get errorMessage(): Locator {
 *     return this.page.getByText(Messages.LOGIN_ERROR);
 * }
 *
 * // In an API test
 * url: ApiEndpoints.LOGIN,
 * url: fillPath(ApiEndpoints.PRODUCT, { productId }),
 * ```
 */

/** Common UI messages — every value verified against the live demo app */
export enum Messages {
    LOGIN_ERROR = 'Invalid email or password',
    EMAIL_REQUIRED = 'Email is required',
    PASSWORD_REQUIRED = 'Password is required',
    EMAIL_FORMAT_INVALID = 'Email format is invalid',
}

/** UI route paths — taken from the Angular router of the live app */
export enum AppRoutes {
    // Shop
    HOME = '/',
    PRODUCT = '/product/:id',
    CATEGORY = '/category/:slug',
    RENTALS = '/rentals',
    COMPARISON = '/comparison',
    CONTACT = '/contact',
    PRIVACY = '/privacy',
    CHECKOUT = '/checkout',

    // Auth
    LOGIN = '/auth/login',
    REGISTER = '/auth/register',
    FORGOT_PASSWORD = '/auth/forgot-password',

    // Account
    ACCOUNT = '/account',
    ACCOUNT_PROFILE = '/account/profile',
    ACCOUNT_FAVORITES = '/account/favorites',
    ACCOUNT_INVOICES = '/account/invoices',
    ACCOUNT_INVOICE = '/account/invoices/:id',
    ACCOUNT_MESSAGES = '/account/messages',
    ACCOUNT_MESSAGE = '/account/messages/:id',

    // Admin
    ADMIN_DASHBOARD = '/admin/dashboard',
    ADMIN_PRODUCTS = '/admin/products',
    ADMIN_PRODUCT_ADD = '/admin/products/add',
    ADMIN_PRODUCT_EDIT = '/admin/products/edit/:id',
    ADMIN_CATEGORIES = '/admin/categories',
    ADMIN_CATEGORY_ADD = '/admin/categories/add',
    ADMIN_CATEGORY_EDIT = '/admin/categories/edit/:id',
    ADMIN_BRANDS = '/admin/brands',
    ADMIN_BRAND_ADD = '/admin/brands/add',
    ADMIN_BRAND_EDIT = '/admin/brands/edit/:id',
    ADMIN_ORDERS = '/admin/orders',
    ADMIN_ORDER_ADD = '/admin/orders/add',
    ADMIN_ORDER_EDIT = '/admin/orders/edit/:id',
    ADMIN_USERS = '/admin/users',
    ADMIN_USER_ADD = '/admin/users/add',
    ADMIN_USER_EDIT = '/admin/users/edit/:id',
    ADMIN_MESSAGES = '/admin/messages',
    ADMIN_MESSAGE = '/admin/messages/:id',
    ADMIN_SETTINGS = '/admin/settings',
    ADMIN_REPORTS_STATISTICS = '/admin/reports/statistics',
    ADMIN_REPORTS_SALES_PER_MONTH = '/admin/reports/average-sales-per-month',
    ADMIN_REPORTS_SALES_PER_WEEK = '/admin/reports/average-sales-per-week',
}

/** API endpoint paths — taken from the OpenAPI spec (`/docs?api-docs.json`) */
export enum ApiEndpoints {
    // Brand
    BRANDS = '/brands',
    BRAND = '/brands/{brandId}',
    BRANDS_SEARCH = '/brands/search',

    // Cart
    CARTS = '/carts',
    CART = '/carts/{cartId}',
    CART_PRODUCT_QUANTITY = '/carts/{cartId}/product/quantity',
    CART_PRODUCT = '/carts/{cartId}/product/{productId}',

    // Category
    CATEGORIES = '/categories',
    CATEGORY = '/categories/{categoryId}',
    CATEGORIES_TREE = '/categories/tree',
    CATEGORY_TREE = '/categories/tree/{categoryId}',
    CATEGORIES_SEARCH = '/categories/search',

    // Contact
    MESSAGES = '/messages',
    MESSAGE = '/messages/{messageId}',
    MESSAGE_ATTACH_FILE = '/messages/{messageId}/attach-file',
    MESSAGE_REPLY = '/messages/{messageId}/reply',
    MESSAGE_STATUS = '/messages/{messageId}/status',

    // Favorite
    FAVORITES = '/favorites',
    FAVORITE = '/favorites/{favoriteId}',

    // Image
    IMAGES = '/images',

    // Invoice
    INVOICES = '/invoices',
    INVOICE = '/invoices/{invoiceId}',
    INVOICES_GUEST = '/invoices/guest',
    INVOICE_STATUS = '/invoices/{invoiceId}/status',
    INVOICES_SEARCH = '/invoices/search',
    INVOICE_DOWNLOAD_PDF = '/invoices/{invoice_number}/download-pdf',
    INVOICE_DOWNLOAD_PDF_STATUS = '/invoices/{invoice_number}/download-pdf-status',

    // Payment
    PAYMENT_CHECK = '/payment/check',

    // Postcode
    POSTCODE_LOOKUP = '/postcode-lookup',

    // Product
    PRODUCTS = '/products',
    PRODUCT = '/products/{productId}',
    PRODUCT_RELATED = '/products/{productId}/related',
    PRODUCTS_SEARCH = '/products/search',

    // Product Spec
    PRODUCT_SPECS = '/products/{productId}/specs',
    PRODUCT_SPEC = '/products/{productId}/specs/{specId}',
    PRODUCT_SPEC_NAMES = '/product-specs/names',

    // Report
    REPORT_TOTAL_SALES_PER_COUNTRY = '/reports/total-sales-per-country',
    REPORT_TOP10_PURCHASED_PRODUCTS = '/reports/top10-purchased-products',
    REPORT_TOP10_BEST_SELLING_CATEGORIES = '/reports/top10-best-selling-categories',
    REPORT_TOTAL_SALES_OF_YEARS = '/reports/total-sales-of-years',
    REPORT_AVERAGE_SALES_PER_MONTH = '/reports/average-sales-per-month',
    REPORT_AVERAGE_SALES_PER_WEEK = '/reports/average-sales-per-week',
    REPORT_CUSTOMERS_BY_COUNTRY = '/reports/customers-by-country',

    // Stream
    SALES_STREAM = '/sales-stream',

    // TOTP
    TOTP_SETUP = '/totp/setup',
    TOTP_VERIFY = '/totp/verify',

    // User
    USERS = '/users',
    USER = '/users/{userId}',
    USERS_SEARCH = '/users/search',
    LOGIN = '/users/login',
    LOGOUT = '/users/logout',
    REFRESH = '/users/refresh',
    CURRENT_USER = '/users/me',
    REGISTER = '/users/register',
    FORGOT_PASSWORD = '/users/forgot-password',
    CHANGE_PASSWORD = '/users/change-password',
}

/** Storage state file paths */
export enum StorageStatePaths {
    APP = '.auth/app/appStorageState.json',
    ADMIN = '.auth/app/adminStorageState.json',
}

/** User validation rules from the OpenAPI `UserRequest` contract */
export enum UserRules {
    MIN_AGE = 18,
    MAX_AGE = 75,
    FIRST_NAME_MAX_LENGTH = 40,
    LAST_NAME_MAX_LENGTH = 20,
    PASSWORD_MIN_LENGTH = 8,
    PHONE_MAX_LENGTH = 24,
    EMAIL_MAX_LENGTH = 256,
}

/** Catalog validation rules — backend FormRequests (brand, category, product, product spec) */
export enum CatalogRules {
    NAME_AND_SLUG_MAX_LENGTH = 120,
    DESCRIPTION_MAX_LENGTH = 1250,
    SPEC_NAME_MAX_LENGTH = 100,
    SPEC_VALUE_MAX_LENGTH = 255,
    SPEC_UNIT_MAX_LENGTH = 30,
}

/** Product CO₂ ratings offered by the admin product form; A and B count as eco-friendly */
export enum Co2Ratings {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D',
    E = 'E',
}

/** API authentication rules */
export enum AuthRules {
    /** Re-login when an access token (JWT, 5-minute lifetime) expires within this many seconds */
    TOKEN_REFRESH_MARGIN_SECONDS = 120,
}

/** API error / result messages — verified against the live API and the backend source */
export enum ApiMessages {
    UNAUTHORIZED = 'Unauthorized',
    INVALID_LOGIN_REQUEST = 'Invalid login request',
    ACCOUNT_LOCKED = 'Account locked, too many failed attempts. Please contact the administrator.',
    ACCOUNT_DISABLED = 'Account disabled',
    TOTP_REQUIRED = 'TOTP required',
    INVALID_TOTP = 'Invalid TOTP',
    UNAUTHORIZED_TOKEN_USAGE = 'Unauthorized token usage',
    INVALID_OR_EXPIRED_TOKEN = 'Invalid or expired token',
    TOTP_NOT_ALLOWED = 'TOTP cannot be set up for this account',
    TOTP_ALREADY_ENABLED = 'TOTP already enabled',
    TOTP_ENABLED = 'TOTP enabled successfully',
    LOGGED_OUT = 'Successfully logged out',
    WRONG_CURRENT_PASSWORD = 'Your current password does not matches with the password.',
    SAME_NEW_PASSWORD = 'New Password cannot be same as your current password.',
    ONLY_OWN_DATA = 'You can only update your own data.',
    DUPLICATE_ENTRY = 'Duplicate Entry',
    ITEM_ADDED = 'item added or updated',
    CART_NOT_FOUND = 'Cart not found',
    ONE_THOR_HAMMER = 'You can only have one Thor Hammer in the cart.',
    PAYMENT_SUCCESSFUL = 'Payment was successful',
    PDF_NOT_INITIATED = 'NOT_INITIATED',
    PDF_NOT_CREATED = 'Document not created. Try again later.',
    INVOICE_NOT_FOUND = 'Invoice not found',
    FILE_NOT_EMPTY = 'Currently we only allow empty files.',
    FILE_NOT_TXT = 'The file extension is incorrect, we only accept txt files.',
    FILE_MISSING = 'No file attached.',
    POSTCODE_FORMAT_INVALID = 'The postal code format is not valid for the selected country.',
}

/** Payment methods — `payment_method` enum of the OpenAPI `InvoiceRequest` / `PaymentRequest` */
export enum PaymentMethods {
    BANK_TRANSFER = 'bank-transfer',
    CASH_ON_DELIVERY = 'cash-on-delivery',
    CREDIT_CARD = 'credit-card',
    BUY_NOW_PAY_LATER = 'buy-now-pay-later',
    GIFT_CARD = 'gift-card',
}

/** Invoice (order) statuses — `InvoiceStatusRequest` enum of the OpenAPI contract */
export enum InvoiceStatuses {
    AWAITING_FULFILLMENT = 'AWAITING_FULFILLMENT',
    ON_HOLD = 'ON_HOLD',
    AWAITING_SHIPMENT = 'AWAITING_SHIPMENT',
    SHIPPED = 'SHIPPED',
    COMPLETED = 'COMPLETED',
}

/** Contact message statuses — `ContactStatusRequest` enum of the OpenAPI contract */
export enum ContactStatuses {
    NEW = 'NEW',
    ON_HOLD = 'ON_HOLD',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
}

/** Contact form subjects — option values of the live contact form */
export enum ContactSubjects {
    CUSTOMER_SERVICE = 'customer-service',
    WEBMASTER = 'webmaster',
    RETURN = 'return',
    PAYMENTS = 'payments',
    WARRANTY = 'warranty',
    STATUS_OF_ORDER = 'status-of-order',
}

/** Checkout business rules — backend CartService / InvoiceService / controllers */
export enum CheckoutRules {
    /** Extra discount when a cart holds both rental and non-rental items */
    COMBINATION_DISCOUNT_PERCENTAGE = 15,
    /** Extra discount when more than half of the items are eco-friendly (CO₂ A/B) */
    ECO_DISCOUNT_PERCENTAGE = 5,
    CART_MAX_QUANTITY = 99,
    CONTACT_MESSAGE_MAX_LENGTH = 250,
}

/** Seed products with special cart rules */
export enum SpecialProducts {
    /** At most one per cart */
    THOR_HAMMER = 'Thor Hammer',
}

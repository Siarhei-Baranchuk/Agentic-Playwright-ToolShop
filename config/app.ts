/**
 * Application configuration object.
 * Contains URL configuration for the main application.
 *
 * For route paths and API endpoints, use enums from `enums/app/app.ts`.
 */
export const appConfig = {
    /** Frontend application URL, from the APP_URL env variable */
    appUrl: process.env.APP_URL,
    /** Backend API URL, from the API_URL env variable (default base for `apiRequest`) */
    apiUrl: process.env.API_URL,
};

/** UI timings that are not covered by the Playwright action / expect timeouts */
export const uiTimeouts = {
    /** How long an action waits for the request its click should send before repeating the click (ms) */
    requestAfterClick: 3000,
};

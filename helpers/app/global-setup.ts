import { setAdminAccessToken, setUserAccessToken } from './createStorageState';

/**
 * Playwright global setup — runs once in the main process before any worker.
 *
 * Environment variables set here are inherited by all workers, which is why
 * the API access tokens (customer and admin) are obtained here rather than in `auth.setup.ts`
 * (a setup *test* runs inside a worker, and its `process.env` changes are
 * not visible to other workers).
 *
 * Registered via `globalSetup` in `playwright.config.ts`.
 *
 * @returns {Promise<void>} Resolves when all global auth state is ready.
 */
export default async function globalSetup(): Promise<void> {
    await setUserAccessToken();
    await setAdminAccessToken();
}

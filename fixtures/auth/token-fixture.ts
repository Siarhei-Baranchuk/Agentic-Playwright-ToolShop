import { test as base } from '@playwright/test';
import { refreshAccessTokens } from '../../helpers/app/createStorageState';

/**
 * Keeps the API access tokens valid for the whole run.
 *
 * API tokens live 5 minutes, while `globalSetup` logs in only once. These
 * auto fixtures refresh `process.env.ACCESS_TOKEN` and
 * `process.env.ADMIN_ACCESS_TOKEN` in each worker process when they are
 * about to expire — at worker start (so `beforeAll` hooks get fresh tokens)
 * and before every test. A refresh costs no request while the tokens are
 * still valid: the expiry is read from the JWT itself.
 *
 * Nothing to request in tests — both fixtures are `auto`.
 */
export type TokenFixtures = {
    freshAccessTokens: void;
};

export type TokenWorkerFixtures = {
    workerAccessTokens: void;
};

export const test = base.extend<TokenFixtures, TokenWorkerFixtures>({
    workerAccessTokens: [
        async ({}, use): Promise<void> => {
            await refreshAccessTokens();
            await use();
        },
        { scope: 'worker', auto: true },
    ],

    freshAccessTokens: [
        async ({}, use): Promise<void> => {
            await refreshAccessTokens();
            await use();
        },
        { auto: true },
    ],
});

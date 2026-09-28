/**
 * auth.setup.ts
 * Playwright setup project: logs in through the UI once and saves the
 * browser storage states reused by the `chromium` (customer) and
 * `chromium-admin` (admin) projects.
 *
 * The API access token is obtained separately in `helpers/app/global-setup.ts`
 * (Playwright `globalSetup`), so it is shared with every worker and project.
 */

import * as fs from 'node:fs';
import { expect, test } from '../../fixtures/pom/test-options';
import { StorageStatePaths } from '../../enums/app/app';
import {
    createAdminStorageState,
    createAppStorageState,
} from '../../helpers/app/createStorageState';

test.describe('auth setup', () => {
    test('setup authentication - browser storage state', async ({ page }) => {
        await createAppStorageState(page);
        expect(fs.existsSync(StorageStatePaths.APP)).toBe(true);
    });

    test('setup authentication - admin storage state', async ({ page }) => {
        await createAdminStorageState(page);
        expect(fs.existsSync(StorageStatePaths.ADMIN)).toBe(true);
    });
});

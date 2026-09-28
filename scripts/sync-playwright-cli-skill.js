#!/usr/bin/env node
// Copies the playwright-cli agent skill bundled with the installed
// @playwright/test into .claude/skills/playwright-cli, so the skill always
// matches the `npx playwright cli` version the project actually runs.
//
// Run after every Playwright upgrade:
//   npm install -D @playwright/test@latest
//   npx playwright install chromium
//   npm run skills:sync-cli

const fs = require('fs');
const path = require('path');

const root = process.cwd();

let source;
let version;
try {
    const testPkg = require.resolve('@playwright/test/package.json', {
        paths: [root],
    });
    const corePkg = require.resolve('playwright-core/package.json', {
        paths: [path.dirname(testPkg)],
    });
    version = require(corePkg).version;
    source = path.join(
        path.dirname(corePkg),
        'lib',
        'tools',
        'skills',
        'playwright-cli'
    );
} catch {
    console.error(
        '@playwright/test is not installed — run `npm install` first.'
    );
    process.exit(1);
}

if (!fs.existsSync(path.join(source, 'SKILL.md'))) {
    console.error(`No bundled playwright-cli skill found at ${source}`);
    process.exit(1);
}

const target = path.join(root, '.claude', 'skills', 'playwright-cli');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

console.log(
    `Synced playwright-cli skill from Playwright ${version} → .claude/skills/playwright-cli`
);

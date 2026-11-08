import { defineConfig } from '@playwright/test';
const base = process.env.SITE_BASE || '/';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 3,
  timeout: 30000,
  reporter: [['list'], ['json', { outputFile: '.local/browser-results.json' }]],
  use: { baseURL: `http://127.0.0.1:8051${base}`, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://127.0.0.1:8051${base}`,
    reuseExistingServer: false,
  },
});

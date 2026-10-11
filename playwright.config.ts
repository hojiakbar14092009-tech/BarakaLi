import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 4173;
const API_PORT = 3001;
const baseURL = `http://localhost:${WEB_PORT}`;

/**
 * Browser tests run against the production build of the web app (`vite preview`, which proxies
 * /api like the dev server) and a throwaway in-memory API database. Build the web app first:
 * `pnpm --filter @barakali/web build`.
 */
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    extraHTTPHeaders: { Origin: baseURL },
    launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @barakali/api start',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        ALLOWED_ORIGINS: baseURL,
        ADMIN_PHONES: '+998909990000',
        SEED_SAMPLE_DATA: 'true',
        PGLITE_DATA_DIR: 'memory',
      },
    },
    {
      command: `pnpm --filter @barakali/web exec vite preview --port ${WEB_PORT} --strictPort`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

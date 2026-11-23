import { defineConfig, devices } from '@playwright/test';

// Tilgjengelighetstester (tests/accessibility.spec.ts) mot den ferdig bygde siden.
// Siden serveres med scripts/preview.mjs, som sender de samme sikkerhetshodene som i drift,
// så brudd på Content-Security-Policy også blir oppdaget. Kjør «npm run build» først.
// Med PRODUCTION=1 kjøres de samme testene mot https://hofstad.net i stedet (ukentlig, se .github/workflows/production.yml).
const PORT = 4331;
const production = process.env.PRODUCTION === '1';

export default defineConfig({
  testDir: 'tests',
  // Enhetstestene i tests/unit/ kjøres med Node sin testkjører (npm run test:unit), ikke med Playwright
  testIgnore: ['**/unit/**'],
  // Godkjente skjermbilder for de visuelle testene (tests/visual.spec.ts), uten plattform i navnet
  snapshotPathTemplate: '{testDir}/screenshots/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  use: { baseURL: production ? 'https://hofstad.net' : `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: production ? undefined : {
    command: 'node scripts/preview.mjs',
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

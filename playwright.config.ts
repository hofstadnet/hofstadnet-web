import { defineConfig, devices } from '@playwright/test';

// Tilgjengelighetstester (tests/tilgjengelighet.spec.ts) mot den ferdig bygde siden.
// Siden serveres med scripts/forhandsvis.mjs, som sender de samme sikkerhetshodene som i drift,
// så brudd på Content-Security-Policy også blir oppdaget. Kjør «npm run build» først.
const PORT = 4331;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-rapport' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/forhandsvis.mjs',
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

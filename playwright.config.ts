import { defineConfig, devices } from '@playwright/test';

// Tilgjengelighetstester (tests/tilgjengelighet.spec.ts) mot den ferdig bygde siden.
// Siden serveres med scripts/forhandsvis.mjs, som sender de samme sikkerhetshodene som i drift,
// så brudd på Content-Security-Policy også blir oppdaget. Kjør «npm run build» først.
// Med PRODUKSJON=1 kjøres de samme testene mot https://hofstad.net i stedet (ukentlig, se .github/workflows/produksjon.yml).
const PORT = 4331;
const produksjon = process.env.PRODUKSJON === '1';

export default defineConfig({
  testDir: 'tests',
  // Godkjente skjermbilder for de visuelle testene (tests/visuell.spec.ts), uten plattform i navnet
  snapshotPathTemplate: '{testDir}/skjermbilder/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-rapport' }]] : 'list',
  use: { baseURL: produksjon ? 'https://hofstad.net' : `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: produksjon ? undefined : {
    command: 'node scripts/forhandsvis.mjs',
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

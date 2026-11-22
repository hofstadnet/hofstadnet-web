import { test, expect, type Page } from '@playwright/test';

// Visuelle regresjonstester: skjermbilder av de viktigste sidene i mørk og lys visning, på pc og mobil,
// sammenlignes med godkjente bilder i tests/screenshots/. CSS-endringer som flytter eller ødelegger noe,
// stopper da i pull requesten.
//
// Bildene lages og sammenlignes bare på Linux (CI), fordi skrift tegnes litt ulikt på Windows og macOS.
// Nye eller endrede bilder: kjør arbeidsflyten Quality manuelt med «update_screenshots», last ned
// artefakten «screenshots» og legg bildene i tests/screenshots/ i en PR.
//
// Ting som endrer seg uten at koden endres, dekkes til (samme størrelse, ensfarget): flystatusen fra
// LiveTrack24 og tallene for siste tur og flystatistikk. Oppsettet rundt dem sjekkes fortsatt.

test.skip(process.platform !== 'linux', 'Skjermbildene er laget på Linux');
test.skip(process.env.PRODUCTION === '1', 'Sammenligner bare bygget fra repoet');

const pages = [
  { name: 'home', path: '/' },
  { name: 'post', path: '/innlegg/clug-roadie-mtb-sykkelstativ/' },
  { name: 'area-air', path: '/omrade/luft/' },
];

const views = [
  { theme: 'dark', name: 'desktop', width: 1280, height: 900 },
  { theme: 'light', name: 'desktop', width: 1280, height: 900 },
  { theme: 'dark', name: 'mobile', width: 375, height: 812 },
  { theme: 'light', name: 'mobile', width: 375, height: 812 },
] as const;

function masks(page: Page) {
  return [page.locator('#flystatus [role="status"]'), page.locator('.last-flight'), page.locator('.flight-stats')];
}

async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Bilder som lastes «lazy», hentes først når de er synlige. Rull gjennom siden så alle er med.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}

for (const p of pages) {
  for (const v of views) {
    test(`skjermbilde ${p.name} · ${v.theme} · ${v.name}`, async ({ page }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.addInitScript((theme) => localStorage.setItem('hofstadnet-color-mode', theme), v.theme);
      await page.goto(p.path, { waitUntil: 'networkidle' });
      await ready(page);
      await expect(page).toHaveScreenshot(`${p.name}-${v.theme}-${v.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: masks(page),
        maxDiffPixelRatio: 0.01,
      });
    });
  }
}

test('skjermbilde søkepanel med treff', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('hofstadnet-color-mode', 'dark'));
  await page.goto('/innlegg/', { waitUntil: 'networkidle' });
  await page.keyboard.press('/');
  await page.locator('#search-panel input').fill('sykkel');
  await expect(page.locator('.search-panel-results mark').first()).toBeVisible();
  await ready(page);
  await expect(page).toHaveScreenshot('search-panel-dark-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.01 });
});

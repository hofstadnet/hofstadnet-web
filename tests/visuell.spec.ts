import { test, expect, type Page } from '@playwright/test';

// Visuelle regresjonstester: skjermbilder av de viktigste sidene i mørk og lys visning, på pc og mobil,
// sammenlignes med godkjente bilder i tests/skjermbilder/. CSS-endringer som flytter eller ødelegger noe,
// stopper da i pull requesten.
//
// Bildene lages og sammenlignes bare på Linux (CI), fordi skrift tegnes litt ulikt på Windows og macOS.
// Nye eller endrede bilder: kjør workflowen Kvalitet manuelt med «oppdater_skjermbilder», last ned
// artefakten «skjermbilder» og legg bildene i tests/skjermbilder/ i en PR.
//
// Ting som endrer seg uten at koden endres, dekkes til (samme størrelse, ensfarget): flystatusen fra
// LiveTrack24 og tallene for siste tur og flystatistikk. Oppsettet rundt dem sjekkes fortsatt.

test.skip(process.platform !== 'linux', 'Skjermbildene er laget på Linux');
test.skip(process.env.PRODUKSJON === '1', 'Sammenligner bare bygget fra repoet');

const sider = [
  { navn: 'forside', sti: '/' },
  { navn: 'innlegg', sti: '/innlegg/clug-roadie-mtb-sykkelstativ/' },
  { navn: 'omrade-luft', sti: '/omrade/luft/' },
];

const visninger = [
  { tema: 'dark', navn: 'pc', bredde: 1280, hoyde: 900 },
  { tema: 'light', navn: 'pc', bredde: 1280, hoyde: 900 },
  { tema: 'dark', navn: 'mobil', bredde: 375, hoyde: 812 },
  { tema: 'light', navn: 'mobil', bredde: 375, hoyde: 812 },
] as const;

function tildekk(page: Page) {
  return [page.locator('#flystatus [role="status"]'), page.locator('.siste-tur'), page.locator('.flystat')];
}

async function klar(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Bilder som lastes «lazy», hentes først når de er synlige. Rull gjennom siden så alle er med.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}

for (const side of sider) {
  for (const v of visninger) {
    test(`skjermbilde ${side.navn} · ${v.tema} · ${v.navn}`, async ({ page }) => {
      await page.setViewportSize({ width: v.bredde, height: v.hoyde });
      await page.addInitScript((tema) => localStorage.setItem('hofstadnet-color-mode', tema), v.tema);
      await page.goto(side.sti, { waitUntil: 'networkidle' });
      await klar(page);
      await expect(page).toHaveScreenshot(`${side.navn}-${v.tema}-${v.navn}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: tildekk(page),
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
  await page.locator('#sokepanel input').fill('sykkel');
  await expect(page.locator('.sokepanel-treff mark').first()).toBeVisible();
  await klar(page);
  await expect(page).toHaveScreenshot('sokepanel-dark-pc.png', { animations: 'disabled', maxDiffPixelRatio: 0.01 });
});

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Sjekker alle sidene i nettstedskartet, i mørk og lys visning, på mobil (320 px) og pc (1280 px):
//  - ingen brudd på WCAG 2.2 A og AA som axe kan oppdage (kontrast, alt-tekster, navn på knapper og lenker …)
//  - siden blir ikke bredere enn skjermen (WCAG 1.4.10, reflow)
//  - ingen brudd på Content-Security-Policy og ingen JavaScript-feil
const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
const pages = [...sitemap.matchAll(/<loc>https:\/\/hofstad\.net([^<]*)<\/loc>/g)].map((m) => m[1]).concat('/finnes-ikke/', '/en/does-not-exist/');

const views = [
  { theme: 'dark', width: 1280, height: 900 },
  { theme: 'light', width: 1280, height: 900 },
  { theme: 'dark', width: 320, height: 740 },
  { theme: 'light', width: 320, height: 740 },
] as const;

for (const path of pages) {
  for (const v of views) {
    test(`${path} · ${v.theme} · ${v.width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`JavaScript: ${e.message}`));
      page.on('console', (m) => {
        // Web Analytics får ikke sende fra localhost, og flystatusen kan mangle nett i CI. Det er ikke feil på siden.
        if (m.type() === 'error' && !/cloudflareinsights|Failed to load resource|ERR_/i.test(m.text())) errors.push(m.text());
      });

      await page.setViewportSize({ width: v.width, height: v.height });
      await page.addInitScript((theme) => localStorage.setItem('hofstadnet-color-mode', theme), v.theme);
      await page.goto(path, { waitUntil: 'networkidle' });

      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // Videorammer fra YouTube og Vimeo lastes først ved klikk og er ikke vår kode
        .exclude('iframe')
        .analyze();
      const violations = result.violations.map((b) => `${b.id} (${b.impact}): ${b.help} – ${b.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
      expect(violations, 'WCAG-brudd').toEqual([]);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, 'siden er bredere enn skjermen').toBeLessThanOrEqual(v.width);

      expect(errors, 'feil i konsollen').toEqual([]);
    });
  }
}

// Søket og galleriet bygger elementer med JavaScript. Kjør dem med de samme hodene som i drift, så brudd på
// Trusted Types eller CSP (f.eks. innerHTML eller en ny Worker-adresse) blir oppdaget her og ikke av besøkende.
test('søk og galleri virker under Trusted Types', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`JavaScript: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/cloudflareinsights|Failed to load resource|ERR_/i.test(m.text())) errors.push(m.text());
  });

  await page.goto('/innlegg/clug-roadie-mtb-sykkelstativ/', { waitUntil: 'networkidle' });
  await page.locator('.v-next').click();
  await expect(page.locator('.v-count')).toHaveText(/^2 \/ \d+$/);

  await page.keyboard.press('/');
  await page.locator('#search-panel input').fill('sykkel');
  await expect(page.locator('.search-panel-results mark').first()).toBeVisible();

  expect(errors, 'feil i konsollen').toEqual([]);
});

// Rask skriving rett etter at panelet åpnes, før Pagefind er lastet, skal likevel gi treff og ikke bli stående
// på «Søker …».
test('søkefeltet gir treff ved rask skriving før indeksen er lastet', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-search-open]').click();
  await page.locator('#search-panel input').pressSequentially('paraglid', { delay: 0 });
  await expect(page.locator('.search-panel-results a').first()).toBeVisible();
  await expect(page.locator('.search-panel-status')).not.toHaveText(/Søker/);
});

// Enter rett etter at søket er endret skal åpne et treff for den nye teksten, ikke det første treffet fra forrige søk
test('Enter åpner ikke et treff fra forrige søk', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-search-open]').click();
  const input = page.locator('#search-panel input');
  await input.fill('sykkel');
  await expect(page.locator('.search-panel-results a').first()).toHaveAttribute('href', /clug-roadie/);
  await input.fill('paraglid');
  await input.press('Enter');
  await page.waitForURL((url) => url.pathname !== '/');
  expect(new URL(page.url()).pathname).not.toMatch(/clug-roadie/);
});

// Språkvelgeren i menyen lenker til den samme siden på det andre språket, og <html lang> følger språket.
// Ukjente adresser under /en/ får den engelske 404-siden.
const translations = [
  { nb: '/', en: '/en/' },
  { nb: '/innlegg/clug-roadie-mtb-sykkelstativ/', en: '/en/posts/clug-roadie-mtb-sykkelstativ/' },
  { nb: '/omrade/luft/', en: '/en/area/air/' },
  { nb: '/personvern/', en: '/en/privacy/' },
];

for (const pair of translations) {
  test(`språkvelger ${pair.nb} ⇄ ${pair.en}`, async ({ page }) => {
    await page.goto(pair.nb);
    await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
    const toEnglish = page.locator('header a.lang-switch');
    await expect(toEnglish).toHaveAttribute('href', pair.en);
    await expect(toEnglish).toHaveAttribute('hreflang', 'en');
    await expect(toEnglish).toHaveAccessibleName('EN – English version');
    await expect(page.locator('link[rel="alternate"][hreflang="en"]:not([type])')).toHaveAttribute('href', `https://hofstad.net${pair.en}`);

    await toEnglish.click();
    await expect(page).toHaveURL(pair.en);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const toNorwegian = page.locator('header a.lang-switch');
    await expect(toNorwegian).toHaveAttribute('href', pair.nb);
    await expect(toNorwegian).toHaveAttribute('hreflang', 'nb');
    await expect(toNorwegian).toHaveAccessibleName('NO – Norsk versjon');
    await expect(page.locator('link[rel="alternate"][hreflang="nb"]:not([type])')).toHaveAttribute('href', `https://hofstad.net${pair.nb}`);
  });
}

test('ukjente adresser under /en/ får den engelske 404-siden', async ({ page }) => {
  const response = await page.goto('/en/does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveText('Nothing here.');
});

// Pagefind lager én indeks per språk ut fra <html lang>. Engelsk søk skal gi engelske innlegg, og norsk søk norske.
test('søket finner innlegg på språket til siden', async ({ page }) => {
  await page.goto('/en/search/?q=bike');
  const english = page.locator('.search-results a');
  await expect(english.first()).toHaveAttribute('href', /^\/en\/posts\/clug-roadie-mtb-sykkelstativ\/$/);
  expect(await english.evaluateAll((links) => links.every((a) => a.getAttribute('href')?.startsWith('/en/posts/')))).toBe(true);

  await page.goto('/en/');
  await page.keyboard.press('/');
  await page.locator('#search-panel input').fill('wind');
  await expect(page.locator('.search-panel-results a').first()).toHaveAttribute('href', /^\/en\/posts\//);
  await expect(page.locator('.search-panel-status')).toHaveText(/results?\.$/);

  await page.goto('/sok/?q=sykkel');
  const norwegian = page.locator('.search-results a');
  await expect(norwegian.first()).toHaveAttribute('href', /^\/innlegg\/clug-roadie-mtb-sykkelstativ\/$/);
  expect(await norwegian.evaluateAll((links) => links.every((a) => a.getAttribute('href')?.startsWith('/innlegg/')))).toBe(true);
});

// Søkeknappen er en lenke med role="button" og skal åpnes med både Enter og Mellomrom, som en vanlig knapp
test('søkeknappen åpnes med Mellomrom og Enter', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('[data-search-open]');
  const panel = page.locator('#search-panel');
  await button.focus();
  await page.keyboard.press('Space');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
});

// /api/csp tar bare imot POST, svarer alltid 204 uten innhold, og tåler både Reporting API og report-uri
test('CSP-rapporter tas imot uten å svare med innhold', async ({ request }) => {
  const reporting = await request.post('/api/csp', {
    headers: { 'Content-Type': 'application/reports+json' },
    data: [{ type: 'csp-violation', body: { documentURL: 'https://hofstad.net/?q=hemmelig', effectiveDirective: 'script-src-elem', blockedURL: 'inline', disposition: 'enforce' } }],
  });
  expect(reporting.status()).toBe(204);
  expect(await reporting.text()).toBe('');

  const legacy = await request.post('/api/csp', {
    headers: { 'Content-Type': 'application/csp-report' },
    data: { 'csp-report': { 'document-uri': 'https://hofstad.net/', 'violated-directive': 'img-src', 'blocked-uri': 'https://eksempel.no/bilde.png' } },
  });
  expect(legacy.status()).toBe(204);

  const invalid = await request.post('/api/csp', { headers: { 'Content-Type': 'application/json' }, data: 'ikke json' });
  expect(invalid.status()).toBe(204);

  const get = await request.get('/api/csp');
  expect(get.status()).toBe(405);
});

// Sider uten eget bilde deles med standardbildet, med taglinjen på sidens språk
test('delingsbildet følger språket på siden', async ({ page }) => {
  await page.goto('/personvern/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-image-1200x630\.png$/);
  await page.goto('/en/privacy/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-image-en-1200x630\.png$/);
  const response = await page.request.get('/og-image-en-1200x630.png');
  expect(response.status()).toBe(200);
});

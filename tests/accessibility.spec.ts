import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Sjekker alle sidene i nettstedskartet, i mørk og lys visning, på mobil (320 px) og pc (1280 px):
//  - ingen brudd på WCAG 2.2 A og AA som axe kan oppdage (kontrast, alt-tekster, navn på knapper og lenker …)
//  - siden blir ikke bredere enn skjermen (WCAG 1.4.10, reflow)
//  - ingen brudd på Content-Security-Policy og ingen JavaScript-feil
const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
const pages = [...sitemap.matchAll(/<loc>https:\/\/hofstad\.net([^<]*)<\/loc>/g)].map((m) => m[1]).concat('/finnes-ikke/');

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

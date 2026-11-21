import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Sjekker alle sidene i nettstedskartet, i mørk og lys visning, på mobil (320 px) og pc (1280 px):
//  - ingen brudd på WCAG 2.2 A og AA som axe kan oppdage (kontrast, alt-tekster, navn på knapper og lenker …)
//  - siden blir ikke bredere enn skjermen (WCAG 1.4.10, reflow)
//  - ingen brudd på Content-Security-Policy og ingen JavaScript-feil
const kart = readFileSync('dist/sitemap-0.xml', 'utf8');
const sider = [...kart.matchAll(/<loc>https:\/\/hofstad\.net([^<]*)<\/loc>/g)].map((m) => m[1]).concat('/finnes-ikke/');

const visninger = [
  { tema: 'dark', bredde: 1280, hoyde: 900 },
  { tema: 'light', bredde: 1280, hoyde: 900 },
  { tema: 'dark', bredde: 320, hoyde: 740 },
  { tema: 'light', bredde: 320, hoyde: 740 },
] as const;

for (const sti of sider) {
  for (const v of visninger) {
    test(`${sti} · ${v.tema} · ${v.bredde}px`, async ({ page }) => {
      const feil: string[] = [];
      page.on('pageerror', (e) => feil.push(`JavaScript: ${e.message}`));
      page.on('console', (m) => {
        // Web Analytics får ikke sende fra localhost, og flystatusen kan mangle nett i CI. Det er ikke feil på siden.
        if (m.type() === 'error' && !/cloudflareinsights|Failed to load resource|ERR_/i.test(m.text())) feil.push(m.text());
      });

      await page.setViewportSize({ width: v.bredde, height: v.hoyde });
      await page.addInitScript((tema) => localStorage.setItem('hofstadnet-color-mode', tema), v.tema);
      await page.goto(sti, { waitUntil: 'networkidle' });

      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // Videorammer fra YouTube og Vimeo lastes først ved klikk og er ikke vår kode
        .exclude('iframe')
        .analyze();
      const brudd = resultat.violations.map((b) => `${b.id} (${b.impact}): ${b.help} – ${b.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
      expect(brudd, 'WCAG-brudd').toEqual([]);

      const bredde = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(bredde, 'siden er bredere enn skjermen').toBeLessThanOrEqual(v.bredde);

      expect(feil, 'feil i konsollen').toEqual([]);
    });
  }
}

// Søket og galleriet bygger elementer med JavaScript. Kjør dem med de samme hodene som i drift, så brudd på
// Trusted Types eller CSP (f.eks. innerHTML eller en ny Worker-adresse) blir oppdaget her og ikke av besøkende.
test('søk og galleri virker under Trusted Types', async ({ page }) => {
  const feil: string[] = [];
  page.on('pageerror', (e) => feil.push(`JavaScript: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/cloudflareinsights|Failed to load resource|ERR_/i.test(m.text())) feil.push(m.text());
  });

  await page.goto('/innlegg/clug-roadie-mtb-sykkelstativ/', { waitUntil: 'networkidle' });
  await page.locator('.v-next').click();
  await expect(page.locator('.v-count')).toHaveText(/^2 \/ \d+$/);

  await page.keyboard.press('/');
  await page.locator('#sokepanel input').fill('sykkel');
  await expect(page.locator('.sokepanel-treff mark').first()).toBeVisible();

  expect(feil, 'feil i konsollen').toEqual([]);
});

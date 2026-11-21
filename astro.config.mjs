import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// lastmod i nettstedskartet: «oppdatert» eller «publisert» fra innleggets frontmatter.
// Leses direkte fra filene, fordi innholdssamlingene ikke er tilgjengelige i oppsettfilen.
const INNLEGG = 'src/content/innlegg';
const datoer = new Map(
  readdirSync(INNLEGG)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => {
      const fm = readFileSync(`${INNLEGG}/${f}`, 'utf8').split(/^---$/m)[1] ?? '';
      const felt = (navn) => fm.match(new RegExp(`^${navn}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
      return [`/innlegg/${f.replace(/\.mdx?$/, '')}/`, felt('oppdatert') ?? felt('publisert')];
    })
    .filter(([, d]) => d),
);
function leggTilLastmod(side) {
  const dato = datoer.get(new URL(side.url).pathname);
  return dato ? { ...side, lastmod: new Date(dato).toISOString() } : side;
}

// Siden bygges til rene statiske filer. Stilark og skript legges alltid i egne filer,
// slik at Content-Security-Policy kan forby innebygd kode (se public/_headers).
export default defineConfig({
  site: 'https://hofstad.net',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  integrations: [mdx(), sitemap({ serialize: leggTilLastmod })],
  // Små skript ville ellers blitt lagt rett inn i HTML-en. CSP tillater bare skript fra egne filer.
  vite: { build: { assetsInlineLimit: 0 } },
});

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// lastmod i nettstedskartet: «updated» eller «published» fra innleggets frontmatter.
// Leses direkte fra filene, fordi innholdssamlingene ikke er tilgjengelige i oppsettfilen.
const POSTS_DIR = 'src/content/posts';
const dates = new Map(
  readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => {
      const fm = readFileSync(`${POSTS_DIR}/${f}`, 'utf8').split(/^---$/m)[1] ?? '';
      const field = (name) => fm.match(new RegExp(`^${name}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
      return [`/innlegg/${f.replace(/\.mdx?$/, '')}/`, field('updated') ?? field('published')];
    })
    .filter(([, d]) => d),
);
function addLastmod(page) {
  const date = dates.get(new URL(page.url).pathname);
  return date ? { ...page, lastmod: new Date(date).toISOString() } : page;
}

// Siden bygges til rene statiske filer. Stilark og skript legges alltid i egne filer,
// slik at Content-Security-Policy kan forby innebygd kode (se public/_headers).
export default defineConfig({
  site: 'https://hofstad.net',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  integrations: [mdx(), sitemap({ serialize: addLastmod })],
  // Små skript ville ellers blitt lagt rett inn i HTML-en. CSP tillater bare skript fra egne filer.
  vite: { build: { assetsInlineLimit: 0 } },
});

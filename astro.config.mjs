import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { counterpart, urls } from './src/i18n/urls.ts';

const SITE = 'https://hofstad.net';

// lastmod i nettstedskartet: «updated» eller «published» fra innleggets frontmatter. Den engelske versjonen har
// de samme datoene. Leses direkte fra filene, fordi innholdssamlingene ikke er tilgjengelige i oppsettfilen.
const POSTS_DIR = 'src/content/posts';
const POSTS_EN_DIR = 'src/content/posts-en';
const postIds = (dir) => readdirSync(dir).filter((f) => /\.mdx?$/.test(f)).map((f) => [f.replace(/\.mdx?$/, ''), f]);
const translated = new Set(postIds(POSTS_EN_DIR).map(([id]) => id));
const dates = new Map(
  postIds(POSTS_DIR)
    .flatMap(([id, f]) => {
      const fm = readFileSync(`${POSTS_DIR}/${f}`, 'utf8').split(/^---$/m)[1] ?? '';
      const field = (name) => fm.match(new RegExp(`^${name}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
      const date = field('updated') ?? field('published');
      return [[urls('nb').post(id), date], [urls('en').post(id), date]];
    })
    .filter(([, d]) => d),
);

// Hver side i nettstedskartet får lastmod (innlegg) og lenker til den samme siden på begge språk (hreflang),
// når siden finnes på begge. Innlegg uten engelsk versjon og enkeltstikkord får ingen språklenker.
function serialize(page) {
  const path = new URL(page.url).pathname;
  const date = dates.get(path);
  const item = date ? { ...page, lastmod: new Date(date).toISOString() } : page;
  const other = counterpart(path);
  if (!other || (other.kind === 'post' && !translated.has(path.split('/').at(-2)))) return item;
  const nb = other.lang === 'nb' ? other.path : path;
  const en = other.lang === 'en' ? other.path : path;
  return {
    ...item,
    links: [
      { lang: 'nb', url: `${SITE}${nb}` },
      { lang: 'en', url: `${SITE}${en}` },
      { lang: 'x-default', url: `${SITE}${nb}` },
    ],
  };
}

// Astro lager 404.html bare på rot. Den engelske 404-siden bygges til en/404/index.html og flyttes hit til
// en/404.html, som Cloudflare leverer for ukjente adresser under /en/ (not_found_handling i wrangler.jsonc).
const notFoundPerLanguage = {
  name: 'not-found-per-language',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const root = fileURLToPath(dir);
      const built = `${root}en/404/index.html`;
      if (!existsSync(built)) return;
      renameSync(built, `${root}en/404.html`);
      rmSync(`${root}en/404`, { recursive: true });
    },
  },
};

// Siden bygges til rene statiske filer. Stilark og skript legges alltid i egne filer,
// slik at Content-Security-Policy kan forby innebygd kode (se public/_headers).
export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  // Norsk på rot uten prefiks, engelsk under /en/. Gir Astro.currentLocale. Ingen automatisk videresending ut fra
  // nettleserens språk: adressen bestemmer språket.
  i18n: {
    locales: ['nb', 'en'],
    defaultLocale: 'nb',
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    mdx(),
    sitemap({ serialize, filter: (page) => new URL(page).pathname !== '/en/404/' }),
    notFoundPerLanguage,
  ],
  // Små skript ville ellers blitt lagt rett inn i HTML-en. CSP tillater bare skript fra egne filer.
  vite: { build: { assetsInlineLimit: 0 } },
});

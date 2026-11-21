import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Siden bygges til rene statiske filer. Stilark og skript legges alltid i egne filer,
// slik at Content-Security-Policy kan forby innebygd kode (se public/_headers).
export default defineConfig({
  site: 'https://hofstad.net',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  integrations: [mdx(), sitemap()],
  // Små skript ville ellers blitt lagt rett inn i HTML-en. CSP tillater bare skript fra egne filer.
  vite: { build: { assetsInlineLimit: 0 } },
});

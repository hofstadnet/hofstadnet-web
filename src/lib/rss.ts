import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { getContainerRenderer as mdxRenderer } from '@astrojs/mdx/container-renderer';
import { getPosts, postUrl, shareImage } from './posts';
import { t, urls, type Lang } from '../i18n';

// RSS for ett språk (/rss.xml og /en/rss.xml), med hele innlegget og hovedbildet øverst, så innleggene kan leses i
// RSS-leseren. Innlegget rendres med Astro sin container-API, og alle adresser gjøres absolutte.
export async function feed(context: APIContext, lang: Lang) {
  const site = context.site!;
  const text = t(lang);
  const posts = await getPosts(lang);
  const container = await AstroContainer.create({ renderers: await loadRenderers([mdxRenderer()]) });

  // RSS-lesere kjører ikke skript, så skript og stilark fra komponentene (galleri, video) fjernes.
  // Til slutt gjøres eventuelle rester ufarlige ved at «<» foran script/style blir «&lt;». Det er ett tegn,
  // så fjerningen kan ikke sette sammen en ny tagg.
  const removeBlocks = (html: string, tag: string) => {
    let s = html;
    const lower = () => s.toLowerCase();
    for (let start = lower().indexOf(`<${tag}`); start !== -1; start = lower().indexOf(`<${tag}`)) {
      const close = lower().indexOf(`</${tag}`, start);
      const end = close === -1 ? -1 : s.indexOf('>', close);
      s = s.slice(0, start) + (end === -1 ? '' : s.slice(end + 1));
    }
    return s;
  };
  const stripScripts = (html: string) =>
    removeBlocks(removeBlocks(html, 'script'), 'style')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/<(?=\s*\/?\s*(script|style)\b)/gi, '&lt;');
  const absolutize = (html: string) =>
    stripScripts(html)
      .replace(/\s(src|href|poster)="\/(?!\/)/g, (_, attr) => ` ${attr}="${site.origin}/`)
      .replace(/\ssrcset="([^"]*)"/g, (_, list: string) =>
        ` srcset="${list.replace(/(^|,\s*)\/(?!\/)/g, (__, separator) => `${separator}${site.origin}/`)}"`);

  const items = await Promise.all(
    posts.map(async (p) => {
      const { Content } = await render(p.entry);
      const body = await container.renderToString(Content);
      const image = await shareImage(p);
      const top = image ? `<p><img src="${image}" alt="${p.data.imageAlt.replace(/"/g, '&quot;')}" /></p>` : '';
      return {
        title: p.data.title,
        description: p.data.summary,
        pubDate: p.data.published,
        link: postUrl(p),
        categories: p.data.tags,
        content: absolutize(`${top}<p><em>${p.data.summary}</em></p>${body}`),
      };
    }),
  );

  return rss({
    title: text.site.feedTitle,
    description: text.site.short,
    // Forsiden for språket (https://hofstad.net/ eller https://hofstad.net/en/)
    site: new URL(urls(lang).home, site),
    items,
    customData: `<language>${text.locale}</language>`,
  });
}

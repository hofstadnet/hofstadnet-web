import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { getContainerRenderer as mdxRenderer } from '@astrojs/mdx';
import { hentInnlegg, adresse, delingsbilde } from '../lib/innlegg';

// Hele innlegget, med hovedbildet øverst, så innleggene kan leses i RSS-leseren.
// Innlegget rendres med Astro sin container-API, og alle adresser gjøres absolutte.
export async function GET(context: APIContext) {
  const site = context.site!;
  const innlegg = await hentInnlegg();
  const container = await AstroContainer.create({ renderers: await loadRenderers([mdxRenderer()]) });

  // RSS-lesere kjører ikke skript, så skript og stilark fra komponentene (galleri, video) fjernes
  const absolutt = (html: string) =>
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
      .replace(/\s(src|href|poster)="\/(?!\/)/g, (_, attr) => ` ${attr}="${site.origin}/`)
      .replace(/\ssrcset="([^"]*)"/g, (_, liste: string) =>
        ` srcset="${liste.replace(/(^|,\s*)\/(?!\/)/g, (__, skille) => `${skille}${site.origin}/`)}"`);

  const items = await Promise.all(
    innlegg.map(async (i) => {
      const { Content } = await render(i);
      const innhold = await container.renderToString(Content);
      const bilde = await delingsbilde(i);
      const topp = bilde ? `<p><img src="${bilde}" alt="${i.data.bildeAlt.replace(/"/g, '&quot;')}" /></p>` : '';
      return {
        title: i.data.tittel,
        description: i.data.ingress,
        pubDate: i.data.publisert,
        link: adresse(i),
        categories: i.data.stikkord,
        content: absolutt(`${topp}<p><em>${i.data.ingress}</em></p>${innhold}`),
      };
    }),
  );

  return rss({
    title: 'Hofstad.NET',
    description: 'Tech, friluft og foto.',
    site,
    items,
    customData: '<language>nb-NO</language>',
  });
}

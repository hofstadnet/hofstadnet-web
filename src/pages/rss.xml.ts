import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { hentInnlegg, adresse } from '../lib/innlegg';

export async function GET(context: APIContext) {
  const innlegg = await hentInnlegg();
  return rss({
    title: 'Hofstad.NET',
    description: 'Tech, friluft og foto.',
    site: context.site!,
    items: innlegg.map((i) => ({
      title: i.data.tittel,
      description: i.data.ingress,
      pubDate: i.data.publisert,
      link: adresse(i),
    })),
    customData: '<language>nb-NO</language>',
  });
}

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { areaIds } from './lib/areas';

// Innholdsmodellen. Feltene valideres ved bygg: et innlegg med ukjent område, manglende dato
// eller et bilde som ikke finnes, stopper bygget i stedet for å havne feil på siden.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      // Hva innlegget handler om. Det første området vises som merkelapp på kort.
      areas: z.array(z.enum(areaIds)).min(1),
      // Hva slags innhold det er, uavhengig av område. Navnet som vises på siden, står i typeLabels i src/lib/posts.ts.
      type: z.enum(['post', 'note', 'review', 'video', 'project']).default('post'),
      tags: z.array(z.string()).default([]),
      image: image().optional(),
      imageAlt: z.string().default(''),
      // Hvilken del av hovedbildet som beholdes når det beskjæres til små miniatyrer
      imageFocus: z.enum(['center', 'left', 'right', 'top', 'bottom']).default('center'),
      // Settes når innlegget inneholder video, slik at kort får avspillingsmerke.
      hasVideo: z.boolean().default(false),
      // Utkast vises lokalt, men bygges ikke til den publiserte siden.
      draft: z.boolean().default(false),
    }),
});

export const collections = { posts };

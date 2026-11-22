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
      // Hva slags innhold det er, uavhengig av område. Navnet som vises på siden, står i «types» i src/i18n/nb.ts.
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

// Engelske versjoner av innleggene, med samme filnavn (ID) som det norske innlegget. Bare tekstene oversettes.
// Datoer, områder, type, bilde, utkast og resten hentes fra det norske innlegget (getPosts i src/lib/posts.ts).
// strict() stopper bygget hvis et felt som hører til det norske innlegget, er skrevet her.
const postsEn = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts-en' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // Uten alt-tekst brukes den norske
    imageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }).strict(),
});

export const collections = { posts, postsEn };

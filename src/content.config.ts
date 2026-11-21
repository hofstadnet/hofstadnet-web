import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { omradeIder } from './lib/omrader';

// Innholdsmodellen. Feltene valideres ved bygg: et innlegg med ukjent område, manglende dato
// eller et bilde som ikke finnes, stopper bygget i stedet for å havne feil på siden.
const innlegg = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/innlegg' }),
  schema: ({ image }) =>
    z.object({
      tittel: z.string(),
      ingress: z.string(),
      publisert: z.coerce.date(),
      oppdatert: z.coerce.date().optional(),
      // Hva innlegget handler om. Det første området vises som merkelapp på kort.
      omrader: z.array(z.enum(omradeIder)).min(1),
      // Hva slags innhold det er, uavhengig av område.
      type: z.enum(['innlegg', 'notat', 'test', 'video', 'prosjekt']).default('innlegg'),
      stikkord: z.array(z.string()).default([]),
      bilde: image().optional(),
      bildeAlt: z.string().default(''),
      // Settes når innlegget inneholder video, slik at kort får avspillingsmerke.
      harVideo: z.boolean().default(false),
      // Utkast vises lokalt, men bygges ikke til den publiserte siden.
      utkast: z.boolean().default(false),
    }),
});

export const collections = { innlegg };

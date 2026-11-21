import { getCollection, type CollectionEntry } from 'astro:content';
import type { OmradeId } from './omrader';

export type Innlegg = CollectionEntry<'innlegg'>;

// Publiserte innlegg, nyeste først. Utkast tas bare med under lokal utvikling.
export async function hentInnlegg(): Promise<Innlegg[]> {
  const alle = await getCollection('innlegg', ({ data }) => import.meta.env.DEV || !data.utkast);
  return alle.sort((a, b) => b.data.publisert.valueOf() - a.data.publisert.valueOf());
}

export function iOmrade(innlegg: Innlegg[], id: OmradeId): Innlegg[] {
  return innlegg.filter((i) => i.data.omrader.includes(id));
}

const kort = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const lang = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const datoKort = (d: Date) => kort.format(d);
export const datoLang = (d: Date) => lang.format(d);
export const datoIso = (d: Date) => d.toISOString().slice(0, 10);
export const adresse = (i: Innlegg) => `/innlegg/${i.id}/`;

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

// Omtrentlig lesetid i hele minutter, minst 1. Regner 200 ord i minuttet.
// Import-linjer, komponenter og Markdown-tegn i MDX-filer telles ikke med.
const ORD_I_MINUTTET = 200;
export function lesetid(i: Innlegg): number {
  const tekst = (i.body ?? '')
    .replace(/^\s*(import|export)\s.*$/gm, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>|~-]/g, ' ');
  const ord = tekst.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  return Math.max(1, Math.round(ord / ORD_I_MINUTTET));
}

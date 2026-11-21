import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
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

// Stikkord i adresser: små bokstaver, æøå skrevet om og mellomrom som bindestrek
export function stikkordId(s: string): string {
  return s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
}

// Alle stikkord med innleggene som har dem, sortert etter antall innlegg og så alfabetisk
export function alleStikkord(innlegg: Innlegg[]): { id: string; navn: string; innlegg: Innlegg[] }[] {
  const kart = new Map<string, { id: string; navn: string; innlegg: Innlegg[] }>();
  for (const i of innlegg) {
    for (const s of i.data.stikkord) {
      const id = stikkordId(s);
      const rad = kart.get(id) ?? { id, navn: s, innlegg: [] };
      rad.innlegg.push(i);
      kart.set(id, rad);
    }
  }
  return [...kart.values()].sort((a, b) => b.innlegg.length - a.innlegg.length || a.navn.localeCompare(b.navn, 'nb'));
}

// Relaterte innlegg: felles stikkord teller dobbelt, felles område enkelt. Nyeste først ved likt.
export function relaterte(denne: Innlegg, alle: Innlegg[], antall = 3): Innlegg[] {
  const stikkord = new Set(denne.data.stikkord.map(stikkordId));
  const omrader = new Set<string>(denne.data.omrader);
  return alle
    .filter((i) => i.id !== denne.id)
    .map((i) => ({
      i,
      poeng: i.data.stikkord.filter((s) => stikkord.has(stikkordId(s))).length * 2
        + i.data.omrader.filter((o) => omrader.has(o)).length,
    }))
    .filter((r) => r.poeng > 0)
    .sort((a, b) => b.poeng - a.poeng || b.i.data.publisert.valueOf() - a.i.data.publisert.valueOf())
    .slice(0, antall)
    .map((r) => r.i);
}

// Delingsbilde (Open Graph, 1200 × 630) fra hovedbildet til et innlegg, eller fra det første innlegget i en
// liste som har bilde. Gir undefined når ingen har bilde, og da brukes standardbildet i Base.astro.
export async function delingsbilde(innlegg: Innlegg | Innlegg[]): Promise<string | undefined> {
  const bilde = [innlegg].flat().find((i) => i.data.bilde)?.data.bilde;
  if (!bilde) return undefined;
  return (await getImage({ src: bilde, width: 1200, height: 630, fit: 'cover', format: 'jpg' })).src;
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

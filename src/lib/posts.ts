import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { AreaId } from './areas';

export type Post = CollectionEntry<'posts'>;
export type PostType = Post['data']['type'];

// Navnet på typen slik det vises på siden. Vanlige innlegg («post») får ingen merkelapp.
export const typeLabels: Record<PostType, string> = {
  post: 'innlegg',
  note: 'notat',
  review: 'test',
  video: 'video',
  project: 'prosjekt',
};

// Publiserte innlegg, nyeste først. Utkast tas bare med under lokal utvikling.
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
}

export function inArea(posts: Post[], id: AreaId): Post[] {
  return posts.filter((p) => p.data.areas.includes(id));
}

// Stikkord i adresser: små bokstaver, æøå skrevet om og mellomrom som bindestrek
export function tagId(s: string): string {
  return s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
}

export type Tag = { id: string; name: string; posts: Post[] };

// Alle stikkord med innleggene som har dem, sortert etter antall innlegg og så alfabetisk
export function allTags(posts: Post[]): Tag[] {
  const map = new Map<string, Tag>();
  for (const p of posts) {
    for (const s of p.data.tags) {
      const id = tagId(s);
      const row = map.get(id) ?? { id, name: s, posts: [] };
      row.posts.push(p);
      map.set(id, row);
    }
  }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, 'nb'));
}

// Relaterte innlegg: felles stikkord teller dobbelt, felles område enkelt. Nyeste først ved likt.
export function relatedPosts(current: Post, all: Post[], count = 3): Post[] {
  const tags = new Set(current.data.tags.map(tagId));
  const areas = new Set<string>(current.data.areas);
  return all
    .filter((p) => p.id !== current.id)
    .map((p) => ({
      p,
      score: p.data.tags.filter((s) => tags.has(tagId(s))).length * 2
        + p.data.areas.filter((a) => areas.has(a)).length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.p.data.published.valueOf() - a.p.data.published.valueOf())
    .slice(0, count)
    .map((r) => r.p);
}

// Delingsbilde (Open Graph, 1200 × 630) fra hovedbildet til et innlegg, eller fra det første innlegget i en
// liste som har bilde. Gir undefined når ingen har bilde, og da brukes standardbildet i Base.astro.
export async function shareImage(posts: Post | Post[]): Promise<string | undefined> {
  const image = [posts].flat().find((p) => p.data.image)?.data.image;
  if (!image) return undefined;
  return (await getImage({ src: image, width: 1200, height: 630, fit: 'cover', format: 'jpg' })).src;
}

const shortFormat = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longFormat = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatDateShort = (d: Date) => shortFormat.format(d);
export const formatDateLong = (d: Date) => longFormat.format(d);
export const formatDateIso = (d: Date) => d.toISOString().slice(0, 10);
export const postUrl = (p: Post) => `/innlegg/${p.id}/`;

// Omtrentlig lesetid i hele minutter, minst 1. Regner 200 ord i minuttet.
// Import-linjer, komponenter og Markdown-tegn i MDX-filer telles ikke med.
const WORDS_PER_MINUTE = 200;
export function readingTime(p: Post): number {
  const text = (p.body ?? '')
    .replace(/^\s*(import|export)\s.*$/gm, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>|~-]/g, ' ');
  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

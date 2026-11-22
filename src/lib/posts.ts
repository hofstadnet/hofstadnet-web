import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { AreaId } from './areas';
import { dateLocale, t, urls, type Lang } from '../i18n';

// Et innlegg på ett språk. Norske innlegg kommer rett fra «posts». Engelske innlegg (samlingen «postsEn») har bare
// tittel, ingress, alt-tekst, stikkord og tekst, og resten (datoer, områder, type, bilde, utkast) hentes fra det
// norske innlegget med samme ID.
export type PostData = CollectionEntry<'posts'>['data'];
export type PostType = PostData['type'];
export interface Post {
  id: string;
  lang: Lang;
  data: PostData;
  body?: string;
  entry: CollectionEntry<'posts'> | CollectionEntry<'postsEn'>;
  // Om innlegget finnes på det andre språket
  translated: boolean;
}

// Navnet på typen slik det vises på siden. Vanlige innlegg («post») får ingen merkelapp.
export const typeLabel = (type: PostType, lang: Lang): string => t(lang).types[type];

const newestFirst = (a: Post, b: Post) => b.data.published.valueOf() - a.data.published.valueOf();

// Publiserte innlegg på et språk, nyeste først. Utkast tas bare med under lokal utvikling.
// Engelske innlegg uten norsk innlegg med samme ID stopper bygget.
export async function getPosts(lang: Lang = 'nb'): Promise<Post[]> {
  const norwegian = await getCollection('posts');
  const english = await getCollection('postsEn');
  const visible = (e: CollectionEntry<'posts'>) => import.meta.env.DEV || !e.data.draft;

  if (lang === 'nb') {
    const translated = new Set(english.map((e) => e.id));
    return norwegian.filter(visible)
      .map((e) => ({ id: e.id, lang, data: e.data, body: e.body, entry: e, translated: translated.has(e.id) }))
      .sort(newestFirst);
  }

  const byId = new Map(norwegian.map((e) => [e.id, e]));
  const posts: Post[] = [];
  for (const e of english) {
    const source = byId.get(e.id);
    if (!source) throw new Error(`src/content/posts-en/${e.id}: fant ikke et norsk innlegg med samme ID i src/content/posts/`);
    if (!visible(source)) continue;
    posts.push({
      id: e.id,
      lang,
      data: { ...source.data, title: e.data.title, summary: e.data.summary, imageAlt: e.data.imageAlt ?? source.data.imageAlt, tags: e.data.tags },
      body: e.body,
      entry: e,
      translated: true,
    });
  }
  return posts.sort(newestFirst);
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
  const lang = posts[0]?.lang ?? 'nb';
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, lang));
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

const formats = new Map<string, Intl.DateTimeFormat>();
function format(lang: Lang, month: 'short' | 'long') {
  const key = `${lang}-${month}`;
  if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat(dateLocale(lang), { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }));
  return formats.get(key)!;
}

export const formatDateShort = (d: Date, lang: Lang) => format(lang, 'short').format(d);
export const formatDateLong = (d: Date, lang: Lang) => format(lang, 'long').format(d);
export const formatDateIso = (d: Date) => d.toISOString().slice(0, 10);
export const postUrl = (p: Post) => urls(p.lang).post(p.id);

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

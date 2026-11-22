// Adresser per språk. Norsk ligger på rot med norske adresser, engelsk under /en/ med engelske.
// Filen har ingen avhengigheter til Astro, så den kan også brukes fra astro.config.mjs (nettstedskartet).

export type Lang = 'nb' | 'en';
export const langs: Lang[] = ['nb', 'en'];
export const defaultLang: Lang = 'nb';

// Områdene har faste ID-er (src/lib/areas.ts). Den engelske adressen bruker et engelsk navn.
const areaSlugs = {
  nb: { luft: 'luft', natur: 'natur', vann: 'vann', 'foto-video': 'foto-video', skjerm: 'skjerm' },
  en: { luft: 'air', natur: 'nature', vann: 'water', 'foto-video': 'photo-video', skjerm: 'screen' },
} as const;
type AreaId = keyof (typeof areaSlugs)['nb'];

const sections = {
  nb: { home: '/', posts: '/innlegg/', area: '/omrade/', tags: '/stikkord/', search: '/sok/', privacy: '/personvern/', rss: '/rss.xml' },
  en: { home: '/en/', posts: '/en/posts/', area: '/en/area/', tags: '/en/tags/', search: '/en/search/', privacy: '/en/privacy/', rss: '/en/rss.xml' },
} as const;

/** Adressene for ett språk, per sidetype */
export function urls(lang: Lang) {
  const s = sections[lang];
  return {
    home: s.home,
    posts: s.posts,
    post: (id: string) => `${s.posts}${id}/`,
    area: (id: AreaId) => `${s.area}${areaSlugs[lang][id]}/`,
    areaSlug: (id: AreaId): string => areaSlugs[lang][id],
    tags: s.tags,
    tag: (id: string) => `${s.tags}${id}/`,
    search: s.search,
    privacy: s.privacy,
    rss: s.rss,
  };
}

export const otherLang = (lang: Lang): Lang => (lang === 'nb' ? 'en' : 'nb');
export const langOfPath = (path: string): Lang => (path.startsWith('/en/') ? 'en' : 'nb');

/**
 * Den samme siden på det andre språket, ut fra adressen. Innlegg beholder ID-en, så den som kaller må sjekke at
 * oversettelsen finnes (kind: 'post'). Sider uten motstykke, som enkeltstikkord (de er ulike på hvert språk), gir
 * undefined.
 */
export function counterpart(path: string): { lang: Lang; path: string; kind: 'page' | 'post' } | undefined {
  const from = langOfPath(path);
  const to = otherLang(from);
  const a = sections[from];
  const b = urls(to);
  for (const key of ['home', 'posts', 'tags', 'search', 'privacy', 'rss'] as const) {
    if (path === a[key]) return { lang: to, path: b[key], kind: 'page' };
  }
  if (path.startsWith(a.posts)) return { lang: to, path: b.post(path.slice(a.posts.length, -1)), kind: 'post' };
  if (path.startsWith(a.area)) {
    const slug = path.slice(a.area.length, -1);
    const id = (Object.keys(areaSlugs[from]) as AreaId[]).find((k) => areaSlugs[from][k] === slug);
    if (id) return { lang: to, path: b.area(id), kind: 'page' };
  }
  return undefined;
}

// Strukturert data (schema.org, JSON-LD) for søkemotorer og forhåndsvisninger.
// Bare opplysninger som allerede står på siden: kallenavnet, profilene i «Finn meg også her» og innleggene.
import type { Post } from './posts';
import { postUrl } from './posts';
import { t, urls, type Lang } from '../i18n';

const SITE = 'https://hofstad.net/';

export const author = {
  '@type': 'Person',
  '@id': `${SITE}#krishofs`,
  name: 'krishofs',
  url: SITE,
  sameAs: [
    'https://www.instagram.com/krishofs/',
    'https://www.youtube.com/@krishofs',
    'https://www.livetrack24.com/user/krishofs',
    'https://pgpilot.app/pilot/krishofs',
    'https://github.com/hofstadnet',
  ],
};

// ID-ene er adresser med anker og følger språket til siden
const websiteId = (lang: Lang) => (lang === 'nb' ? `${SITE}#nettsted` : `${SITE}en/#website`);

export function website(lang: Lang) {
  const home = new URL(urls(lang).home, SITE).toString();
  return {
    '@type': 'WebSite',
    '@id': websiteId(lang),
    name: 'Hofstad.NET',
    url: home,
    inLanguage: t(lang).locale,
    description: t(lang).site.short,
    publisher: { '@id': author['@id'] },
    // Søkefelt rett i Google-treffet, via søkesiden
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${new URL(urls(lang).search, SITE)}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function homePage(lang: Lang) {
  return { '@graph': [website(lang), author] };
}

export function blogPosting(p: Post, image?: string) {
  const d = p.data;
  const url = new URL(postUrl(p), SITE).toString();
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#${p.lang === 'nb' ? 'innlegg' : 'post'}`,
    mainEntityOfPage: url,
    url,
    headline: d.title,
    description: d.summary,
    datePublished: d.published.toISOString().slice(0, 10),
    dateModified: (d.updated ?? d.published).toISOString().slice(0, 10),
    inLanguage: t(p.lang).locale,
    keywords: d.tags.length > 0 ? d.tags.join(', ') : undefined,
    image: image ? new URL(image, SITE).toString() : undefined,
    author: { '@id': author['@id'], '@type': 'Person', name: author.name, url: SITE },
    publisher: { '@id': author['@id'] },
    isPartOf: { '@id': websiteId(p.lang) },
  };
}

// Brødsmulesti for søkeresultatene: Hofstad.NET › Innlegg › tittelen
export function breadcrumbs(p: Post) {
  const u = urls(p.lang);
  const items = [
    { name: 'Hofstad.NET', url: u.home },
    { name: t(p.lang).posts.title, url: u.posts },
    { name: p.data.title, url: postUrl(p) },
  ];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.url, SITE).toString(),
    })),
  };
}

// Alt for innleggssiden: selve innlegget og brødsmulestien
export function postStructuredData(p: Post, image?: string) {
  return { '@graph': [blogPosting(p, image), breadcrumbs(p)] };
}

// Strukturert data (schema.org, JSON-LD) for søkemotorer og forhåndsvisninger.
// Bare opplysninger som allerede står på siden: kallenavnet, profilene i «Finn meg også her» og innleggene.
import type { Post } from './posts';
import { postUrl } from './posts';

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

export const website = {
  '@type': 'WebSite',
  '@id': `${SITE}#nettsted`,
  name: 'Hofstad.NET',
  url: SITE,
  inLanguage: 'nb-NO',
  description: 'Tech, friluft og foto.',
  publisher: { '@id': author['@id'] },
  // Søkefelt rett i Google-treffet, via søkesiden
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}sok/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export function homePage() {
  return { '@graph': [website, author] };
}

export function blogPosting(p: Post, image?: string) {
  const d = p.data;
  const url = new URL(postUrl(p), SITE).toString();
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#innlegg`,
    mainEntityOfPage: url,
    url,
    headline: d.title,
    description: d.summary,
    datePublished: d.published.toISOString().slice(0, 10),
    dateModified: (d.updated ?? d.published).toISOString().slice(0, 10),
    inLanguage: 'nb-NO',
    keywords: d.tags.length > 0 ? d.tags.join(', ') : undefined,
    image: image ? new URL(image, SITE).toString() : undefined,
    author: { '@id': author['@id'], '@type': 'Person', name: author.name, url: SITE },
    publisher: { '@id': author['@id'] },
    isPartOf: { '@id': website['@id'] },
  };
}

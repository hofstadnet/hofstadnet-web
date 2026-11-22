// Strukturert data (schema.org, JSON-LD) for søkemotorer og forhåndsvisninger.
// Bare opplysninger som allerede står på siden: kallenavnet, profilene i «Finn meg også her» og innleggene.
import type { Innlegg } from './innlegg';
import { adresse } from './innlegg';

const SIDE = 'https://hofstad.net/';

export const forfatter = {
  '@type': 'Person',
  '@id': `${SIDE}#krishofs`,
  name: 'krishofs',
  url: SIDE,
  sameAs: [
    'https://www.instagram.com/krishofs/',
    'https://www.youtube.com/@krishofs',
    'https://www.livetrack24.com/user/krishofs',
    'https://pgpilot.app/pilot/krishofs',
    'https://github.com/hofstadnet',
  ],
};

export const nettsted = {
  '@type': 'WebSite',
  '@id': `${SIDE}#nettsted`,
  name: 'Hofstad.NET',
  url: SIDE,
  inLanguage: 'nb-NO',
  description: 'Tech, friluft og foto.',
  publisher: { '@id': forfatter['@id'] },
  // Søkefelt rett i Google-treffet, via søkesiden
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SIDE}sok/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export function forside() {
  return { '@graph': [nettsted, forfatter] };
}

export function innlegg(i: Innlegg, bilde?: string) {
  const d = i.data;
  const url = new URL(adresse(i), SIDE).toString();
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#innlegg`,
    mainEntityOfPage: url,
    url,
    headline: d.tittel,
    description: d.ingress,
    datePublished: d.publisert.toISOString().slice(0, 10),
    dateModified: (d.oppdatert ?? d.publisert).toISOString().slice(0, 10),
    inLanguage: 'nb-NO',
    keywords: d.stikkord.length > 0 ? d.stikkord.join(', ') : undefined,
    image: bilde ? new URL(bilde, SIDE).toString() : undefined,
    author: { '@id': forfatter['@id'], '@type': 'Person', name: forfatter.name, url: SIDE },
    publisher: { '@id': forfatter['@id'] },
    isPartOf: { '@id': nettsted['@id'] },
  };
}

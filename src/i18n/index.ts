// Tekster og adresser per språk. Rutene i src/pages/ (norsk) og src/pages/en/ (engelsk) sender språket videre
// til sidekomponentene i src/components/pages/.
import { nb, type Dictionary } from './nb';
import { en } from './en';
import type { Lang } from './urls';

export { urls, otherLang, langs, defaultLang, counterpart, type Lang } from './urls';
export type { Dictionary } from './nb';

const dictionaries: Record<Lang, Dictionary> = { nb, en };

/** Ordboken for et språk */
export const t = (lang: Lang): Dictionary => dictionaries[lang];

/** Språkkoden datoer og tall formateres med: nb-NO eller en-GB */
export const dateLocale = (lang: Lang): string => dictionaries[lang].locale;

/** Språket fra Astro.currentLocale (i18n i astro.config.mjs). Norsk når det mangler. */
export const toLang = (locale: string | undefined): Lang => (locale === 'en' ? 'en' : 'nb');

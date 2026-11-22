// De fem områdene innleggene sorteres i. ID-ene er faste og brukes i innleggenes «areas»-felt og i de norske
// adressene. Navn og beskrivelse står i src/i18n/nb.ts og src/i18n/en.ts, og de engelske adressene i
// src/i18n/urls.ts. Navnene kan endres uten at adresser brytes.
import { t, type Lang } from '../i18n';

export const areas = [
  { id: 'luft', icon: 'air' },
  { id: 'natur', icon: 'nature' },
  { id: 'vann', icon: 'water' },
  { id: 'foto-video', icon: 'camera' },
  { id: 'skjerm', icon: 'screen' },
] as const;

export type Area = (typeof areas)[number];
export type AreaId = Area['id'];
export const areaIds = areas.map((a) => a.id) as [AreaId, ...AreaId[]];

/** Navn, undertittel og beskrivelse av et område på et språk */
export const areaText = (id: AreaId, lang: Lang) => t(lang).areas[id];
export const areaName = (id: AreaId, lang: Lang): string => areaText(id, lang).name;

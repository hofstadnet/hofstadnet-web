// De fem områdene innleggene sorteres i. ID-ene er faste og brukes i adresser og i innleggenes
// «areas»-felt. Navn og beskrivelse kan endres uten at adresser brytes.
export const areas = [
  { id: 'luft', name: 'I lufta', subtitle: 'Paragliding & speedflying', icon: 'air',
    description: 'Paragliding, speedflying og opplevelser med luft under beina.' },
  { id: 'natur', name: 'Ute i naturen', subtitle: 'Fjell, skog & sykkel', icon: 'nature',
    description: 'Turer på fjellet, i skogen og på sykkel.' },
  { id: 'vann', name: 'Under overflaten', subtitle: 'Fridykking & vann', icon: 'water',
    description: 'Fridykking, undervannsbilder og det som skjer under vann.' },
  { id: 'foto-video', name: 'Bak kameraet', subtitle: 'Foto & video', icon: 'camera',
    description: 'Bilder, film og små glimt fra turene.' },
  { id: 'skjerm', name: 'Foran skjermen', subtitle: 'Prosjekter & digitale ting', icon: 'screen',
    description: 'Egne prosjekter og ting jeg utforsker foran skjermen.' },
] as const;

export type Area = (typeof areas)[number];
export type AreaId = Area['id'];
export const areaIds = areas.map((a) => a.id) as [AreaId, ...AreaId[]];

export function areaName(id: AreaId): string {
  return areas.find((a) => a.id === id)?.name ?? id;
}

// De fem områdene innleggene sorteres i. ID-ene er faste og brukes i adresser og i innleggenes
// «omrader»-felt. Navn og beskrivelse kan endres uten at adresser brytes.
export const omrader = [
  { id: 'luft', navn: 'I lufta', undertekst: 'Paragliding & speedflying', ikon: 'air',
    beskrivelse: 'Paragliding, speedflying og opplevelser med luft under beina.' },
  { id: 'natur', navn: 'Ute i naturen', undertekst: 'Fjell, skog & sykkel', ikon: 'nature',
    beskrivelse: 'Turer på fjellet, i skogen og på sykkel.' },
  { id: 'vann', navn: 'Under overflaten', undertekst: 'Fridykking & vann', ikon: 'water',
    beskrivelse: 'Fridykking, undervannsbilder og det som skjer under vann.' },
  { id: 'foto-video', navn: 'Bak kameraet', undertekst: 'Foto & video', ikon: 'camera',
    beskrivelse: 'Bilder, film og små glimt fra turene.' },
  { id: 'skjerm', navn: 'Foran skjermen', undertekst: 'Prosjekter & digitale ting', ikon: 'screen',
    beskrivelse: 'Egne prosjekter og ting jeg utforsker foran skjermen.' },
] as const;

export type OmradeId = (typeof omrader)[number]['id'];
export const omradeIder = omrader.map((o) => o.id) as [OmradeId, ...OmradeId[]];

export function omradeNavn(id: OmradeId): string {
  return omrader.find((o) => o.id === id)?.navn ?? id;
}

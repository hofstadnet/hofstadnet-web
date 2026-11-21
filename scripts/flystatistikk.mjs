// Lager flystatistikk fra IGC-filer.
//
//   node scripts/flystatistikk.mjs "<mappe med .igc-filer>" [--pilot "Kristoffer"] [--utelat "Navn1|Navn2"]
//
// --utelat hopper over filer der filnavnet passer mønsteret, f.eks. andres spor fra felles turer som er lagret
// med eget instrument og derfor har feil pilotnavn i loggen.
//
// Leser alle .igc-filer i mappen (også undermapper) og skriver samlede tall til src/data/flystatistikk.json.
// Bare summer havner i repoet: ingen spor, koordinater, startsteder eller klokkeslett. Selve IGC-filene
// blir liggende der de er og skal ikke sjekkes inn.
//
// Hva som telles:
//  - Én tur per IGC-fil. Like turer (samme dag, start innen 10 minutter) telles én gang, f.eks. når samme tur er
//    lagret fra både vario og telefon.
//  - Filer der pilotfeltet (HFPLT) er fylt ut med et annet navn enn --pilot, hoppes over (andres spor fra felles turer).
//  - Flytid regnes bare for perioden i bevegelse som inneholder turens høyeste punkt (se analyser()), så tid på
//    bakken og kjøring etter landing ikke telles med.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

const args = process.argv.slice(2);
const mappe = args.find((a) => !a.startsWith('--'));
const pilotIdx = args.indexOf('--pilot');
const pilot = (pilotIdx >= 0 ? args[pilotIdx + 1] : 'Kristoffer').toLowerCase();
if (!mappe) {
  console.error('Bruk: node scripts/flystatistikk.mjs "<mappe med .igc-filer>" [--pilot "Navn"]');
  process.exit(1);
}

const UT = 'src/data/flystatistikk.json';
const MIN_FART = 3; // m/s, grense for «i lufta»
const MIN_FLYTID = 60; // sekunder, kortere enn dette er ikke en tur
const PAUSE = 120; // sekunder stillestående som skiller flyturen fra f.eks. kjøring etterpå
// Pilotfelt som betyr «ikke fylt ut»
const UKJENT = new Set(['', 'nil', 'nkn', 'n/a', 'unknown']);
const ukjentVinge = (v) => UKJENT.has(v.toLowerCase()) || v.toLowerCase() === 'paraglider';
const utelatIdx = args.indexOf('--utelat');
const utelat = utelatIdx >= 0 ? new RegExp(args[utelatIdx + 1], 'i') : null;

async function filer(m) {
  const ut = [];
  for (const e of await readdir(m, { withFileTypes: true })) {
    const sti = join(m, e.name);
    if (e.isDirectory()) ut.push(...(await filer(sti)));
    else if (e.name.toLowerCase().endsWith('.igc')) ut.push(sti);
  }
  return ut;
}

const rad = (g) => (g * Math.PI) / 180;
function avstand(a, b) {
  const R = 6371000;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function les(tekst) {
  let dato = null;
  let pilotNavn = '';
  let vinge = '';
  const punkter = [];
  let dag = 0;
  let forrige = -1;
  for (const linje of tekst.split(/\r?\n/)) {
    if (linje.startsWith('HFDTE')) {
      const m = linje.match(/(\d{2})(\d{2})(\d{2})/);
      if (m) dato = new Date(Date.UTC(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    } else if (linje.startsWith('HFPLT')) {
      pilotNavn = linje.split(':').slice(1).join(':').trim();
    } else if (linje.startsWith('HFGTY')) {
      vinge = linje.split(':').slice(1).join(':').trim();
    } else if (linje.startsWith('B') && linje.length >= 35) {
      const t = Number(linje.slice(1, 3)) * 3600 + Number(linje.slice(3, 5)) * 60 + Number(linje.slice(5, 7));
      if (forrige >= 0 && t < forrige) dag += 86400; // over midnatt UTC
      forrige = t;
      let lat = Number(linje.slice(7, 9)) + Number(linje.slice(9, 14)) / 60000;
      if (linje[14] === 'S') lat = -lat;
      let lon = Number(linje.slice(15, 18)) + Number(linje.slice(18, 23)) / 60000;
      if (linje[23] === 'W') lon = -lon;
      const gyldig = linje[24] === 'A';
      const baro = Number(linje.slice(25, 30));
      const gps = Number(linje.slice(30, 35));
      if (gyldig && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
        punkter.push({ t: t + dag, lat, lon, hoyde: gps > 0 ? gps : baro });
      }
    }
  }
  return { dato, pilotNavn, vinge, punkter };
}

function analyser(p) {
  // Del sporet i perioder i bevegelse (fart over MIN_FART, målt over 10 sekunder for å dempe GPS-støy).
  // Står man stille i minst PAUSE sekunder, f.eks. for å pakke vingen, starter en ny periode. Flyturen er perioden
  // med det høyeste punktet, slik at kjøring hjem etter landing ikke telles med.
  const perioder = [];
  let naa = null;
  for (let i = 0, j = 0; i < p.length; i++) {
    while (j < p.length && p[j].t - p[i].t < 10) j++;
    if (j >= p.length) break;
    if (avstand(p[i], p[j]) / (p[j].t - p[i].t) <= MIN_FART) continue;
    if (naa && p[i].t - p[naa.slutt].t < PAUSE) naa.slutt = j;
    else perioder.push((naa = { start: i, slutt: j }));
  }
  const hoyest = (r) => p.slice(r.start, r.slutt + 1).reduce((m, x) => Math.max(m, x.hoyde), -Infinity);
  const valgt = perioder.sort((a, b) => hoyest(b) - hoyest(a))[0];
  if (!valgt || p[valgt.slutt].t - p[valgt.start].t < MIN_FLYTID) return null;
  const fly = p.slice(valgt.start, valgt.slutt + 1);
  const maks = fly.reduce((m, x) => Math.max(m, x.hoyde), -Infinity);
  return {
    sekunder: fly.at(-1).t - fly[0].t,
    starttid: fly[0].t,
    maksHoyde: maks,
    gevinst: Math.max(0, maks - fly[0].hoyde),
  };
}

const alle = await filer(mappe);
const turer = [];
let andre = 0;
let tomme = 0;
for (const fil of alle) {
  const navn = basename(fil);
  const { dato, pilotNavn, vinge: hodeVinge, punkter } = les(await readFile(fil, 'latin1'));
  const p = pilotNavn.toLowerCase();
  if ((!UKJENT.has(p) && !p.includes(pilot)) || (utelat && utelat.test(navn))) { andre++; continue; }
  const a = dato && punkter.length > 10 ? analyser(punkter) : null;
  if (!a) { tomme++; continue; }
  // Vingen står i loggens hode, ellers i parentes i filnavnet: «… - Sted (Vinge).igc»
  const fraNavn = navn.match(/\(([^)]+)\)\.igc$/i)?.[1] ?? '';
  const vinge = ukjentVinge(hodeVinge) ? fraNavn : hodeVinge;
  turer.push({ dato, vinge, ...a });
}

// Fjern duplikater: samme dag og start innen 10 minutter
turer.sort((x, y) => x.dato - y.dato || x.starttid - y.starttid);
const unike = [];
for (const t of turer) {
  const f = unike.at(-1);
  if (f && +f.dato === +t.dato && Math.abs(f.starttid - t.starttid) < 600) {
    if (t.sekunder > f.sekunder) unike[unike.length - 1] = t;
    continue;
  }
  unike.push(t);
}

const timer = (s) => Math.round((s / 3600) * 10) / 10;
const perAar = new Map();
for (const t of unike) {
  const aar = t.dato.getUTCFullYear();
  const r = perAar.get(aar) ?? { aar, turer: 0, sekunder: 0 };
  r.turer++;
  r.sekunder += t.sekunder;
  perAar.set(aar, r);
}
const vinger = new Map();
for (const t of unike) {
  if (!t.vinge) continue;
  vinger.set(t.vinge, (vinger.get(t.vinge) ?? 0) + 1);
}
const maksAv = (f) => unike.reduce((m, t) => Math.max(m, f(t)), 0);
const sum = unike.reduce((s, t) => s + t.sekunder, 0);

const resultat = {
  kilde: 'IGC-filer fra variometer og telefon',
  generert: new Date().toISOString().slice(0, 10),
  forsteTur: unike[0]?.dato.toISOString().slice(0, 10) ?? null,
  sisteTur: unike.at(-1)?.dato.toISOString().slice(0, 10) ?? null,
  totalt: {
    turer: unike.length,
    timer: timer(sum),
    // Lengste tur og avstand tas ikke med: kjører man rett etter landing uten å stoppe, ser IGC-sporet ut som
    // en lengre tur, og det kan ikke skilles sikkert fra flyging. Høyde og antall påvirkes ikke av dette.
    hoyesteM: Math.round(maksAv((t) => t.maksHoyde)),
    besteHoydegevinstM: Math.round(maksAv((t) => t.gevinst)),
  },
  perAar: [...perAar.values()].sort((a, b) => a.aar - b.aar).map((r) => ({ aar: r.aar, turer: r.turer, timer: timer(r.sekunder) })),
  vinger: [...vinger.entries()].sort((a, b) => b[1] - a[1]).map(([navn, turer]) => ({ navn, turer })),
};

await mkdir(dirname(UT), { recursive: true });
await writeFile(UT, JSON.stringify(resultat, null, 2) + '\n');
console.log(`${alle.length} filer, ${andre} fra andre piloter, ${tomme} uten flytur, ${turer.length - unike.length} duplikater.`);
console.log(`${unike.length} turer, ${resultat.totalt.timer} timer. Skrevet til ${UT}.`);

// Lager flystatistikk fra IGC-filer.
//
//   node scripts/flight-stats.mjs "<mappe med .igc-filer>" ["<mappe 2>" …] [--pilot "Kristoffer"] [--exclude "Navn1,Navn2"]
//
// Flere mapper kan gis, f.eks. arkivet i Google Drive og nye turer lastet ned fra pgpilot
// (offentlige turer: https://pgpilot.app/api/flights/<id>/igc). Samme tur i begge telles én gang.
//
// --exclude hopper over filer som heter «… - Navn (Vinge).igc» for navnene i listen, f.eks. andres spor fra
// felles turer som er lagret med eget instrument og derfor har feil pilotnavn i loggen.
//
// Leser alle .igc-filer i mappen (også undermapper) og skriver samlede tall til src/data/flight-stats.json.
// Bare summer havner i repoet: ingen spor, koordinater, startsteder eller klokkeslett. Selve IGC-filene
// blir liggende der de er og skal ikke sjekkes inn.
//
// Hva som telles:
//  - Én tur per IGC-fil. Like turer (samme dag, start innen 10 minutter) telles én gang, f.eks. når samme tur er
//    lagret fra både vario og telefon.
//  - Filer der pilotfeltet (HFPLT) er fylt ut med et annet navn enn --pilot, hoppes over (andres spor fra felles turer).
//  - Flytid regnes bare for perioden i bevegelse som inneholder turens høyeste punkt (se analyzeFlight() i scripts/lib/igc.mjs), så tid på
//    bakken og kjøring etter landing ikke telles med.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { parseIgc, analyzeFlight } from './lib/igc.mjs';

const args = process.argv.slice(2);
// Alle argumenter som ikke er et valg eller verdien til et valg, er mapper
const dirs = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && /^--(pilot|exclude)$/.test(args[i - 1])));
const pilotIdx = args.indexOf('--pilot');
const pilot = (pilotIdx >= 0 ? args[pilotIdx + 1] : 'Kristoffer').toLowerCase();
if (dirs.length === 0) {
  console.error('Bruk: node scripts/flight-stats.mjs "<mappe>" ["<mappe 2>" …] [--pilot "Navn"] [--exclude "Navn1,Navn2"]');
  process.exit(1);
}

const OUT = 'src/data/flight-stats.json';
// Pilotfelt som betyr «ikke fylt ut»
const UNKNOWN = new Set(['', 'nil', 'nkn', 'n/a', 'unknown']);
const unknownWing = (w) => UNKNOWN.has(w.toLowerCase()) || w.toLowerCase() === 'paraglider';
const excludeIdx = args.indexOf('--exclude');
const excluded = excludeIdx >= 0 ? args[excludeIdx + 1].split(',').map((n) => n.trim().toLowerCase()).filter(Boolean) : [];
// Filnavn på formen «… - Navn (Vinge).igc» er spor fra en annen pilot
const otherPilot = (filename) => excluded.some((n) => filename.toLowerCase().includes(` - ${n} (`));

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(path)));
    else if (e.name.toLowerCase().endsWith('.igc')) out.push(path);
  }
  return out;
}

const all = (await Promise.all(dirs.map(files))).flat();
const flights = [];
let others = 0;
let empty = 0;
for (const file of all) {
  const name = basename(file);
  const { date, pilotName, wing: headerWing, points } = parseIgc(await readFile(file, 'latin1'));
  const p = pilotName.toLowerCase();
  if ((!UNKNOWN.has(p) && !p.includes(pilot)) || otherPilot(name)) { others++; continue; }
  const a = date && points.length > 10 ? analyzeFlight(points) : null;
  if (!a) { empty++; continue; }
  // Vingen står i loggens hode, ellers i parentes i filnavnet: «… - Sted (Vinge).igc»
  const fromName = name.match(/\(([^)]+)\)\.igc$/i)?.[1] ?? '';
  const wing = unknownWing(headerWing) ? fromName : headerWing;
  flights.push({ date, wing, ...a });
}

// Fjern duplikater: samme dag og start innen 10 minutter
flights.sort((x, y) => x.date - y.date || x.startTime - y.startTime);
const unique = [];
for (const f of flights) {
  const prev = unique.at(-1);
  if (prev && +prev.date === +f.date && Math.abs(prev.startTime - f.startTime) < 600) {
    if (f.seconds > prev.seconds) unique[unique.length - 1] = f;
    continue;
  }
  unique.push(f);
}

const hours = (s) => Math.round((s / 3600) * 10) / 10;
const perYear = new Map();
for (const f of unique) {
  const year = f.date.getUTCFullYear();
  const r = perYear.get(year) ?? { year, flights: 0, seconds: 0 };
  r.flights++;
  r.seconds += f.seconds;
  perYear.set(year, r);
}
const wings = new Map();
for (const f of unique) {
  if (!f.wing) continue;
  wings.set(f.wing, (wings.get(f.wing) ?? 0) + 1);
}
const maxOf = (fn) => unique.reduce((m, f) => Math.max(m, fn(f)), 0);
const total = unique.reduce((s, f) => s + f.seconds, 0);
const last = unique.at(-1);

const result = {
  source: 'IGC-filer fra variometer og telefon',
  generated: new Date().toISOString().slice(0, 10),
  firstFlight: unique[0]?.date.toISOString().slice(0, 10) ?? null,
  // Siste tur vises i statuskortet på forsiden. Startsted er ikke med: nyere logger har det ikke.
  lastFlight: last
    ? {
        date: last.date.toISOString().slice(0, 10),
        minutes: Math.round(last.seconds / 60),
        altitudeM: Math.round(last.maxAltitude),
        // Lengden på sporet som ble fløyet, ikke XC-distanse
        trackKm: Math.round(last.track / 100) / 10,
        wing: last.wing || null,
      }
    : null,
  totals: {
    flights: unique.length,
    hours: hours(total),
    // Lengste tur og avstand tas ikke med: kjører man rett etter landing uten å stoppe, ser IGC-sporet ut som
    // en lengre tur, og det kan ikke skilles sikkert fra flyging. Høyde og antall påvirkes ikke av dette.
    highestM: Math.round(maxOf((f) => f.maxAltitude)),
    bestAltitudeGainM: Math.round(maxOf((f) => f.gain)),
  },
  perYear: [...perYear.values()].sort((a, b) => a.year - b.year).map((r) => ({ year: r.year, flights: r.flights, hours: hours(r.seconds) })),
  wings: [...wings.entries()].sort((a, b) => b[1] - a[1]).map(([name, flights]) => ({ name, flights })),
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
console.log(`${all.length} filer, ${others} fra andre piloter, ${empty} uten flytur, ${flights.length - unique.length} duplikater.`);
console.log(`${unique.length} turer, ${result.totals.hours} timer. Skrevet til ${OUT}.`);

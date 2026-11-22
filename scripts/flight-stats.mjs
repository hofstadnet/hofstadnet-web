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
//  - Flytid regnes bare for perioden i bevegelse som inneholder turens høyeste punkt (se analyze()), så tid på
//    bakken og kjøring etter landing ikke telles med.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

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
const MIN_SPEED = 3; // m/s, grense for «i lufta»
const MIN_DURATION = 60; // sekunder, kortere enn dette er ikke en tur
const PAUSE = 120; // sekunder stillestående som skiller flyturen fra f.eks. kjøring etterpå
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

const rad = (deg) => (deg * Math.PI) / 180;
function distance(a, b) {
  const R = 6371000;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function parse(text) {
  let date = null;
  let pilotName = '';
  let wing = '';
  const points = [];
  let dayOffset = 0;
  let previous = -1;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('HFDTE')) {
      const m = line.match(/(\d{2})(\d{2})(\d{2})/);
      if (m) date = new Date(Date.UTC(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    } else if (line.startsWith('HFPLT')) {
      pilotName = line.split(':').slice(1).join(':').trim();
    } else if (line.startsWith('HFGTY')) {
      wing = line.split(':').slice(1).join(':').trim();
    } else if (line.startsWith('B') && line.length >= 35) {
      const t = Number(line.slice(1, 3)) * 3600 + Number(line.slice(3, 5)) * 60 + Number(line.slice(5, 7));
      if (previous >= 0 && t < previous) dayOffset += 86400; // over midnatt UTC
      previous = t;
      let lat = Number(line.slice(7, 9)) + Number(line.slice(9, 14)) / 60000;
      if (line[14] === 'S') lat = -lat;
      let lon = Number(line.slice(15, 18)) + Number(line.slice(18, 23)) / 60000;
      if (line[23] === 'W') lon = -lon;
      const valid = line[24] === 'A';
      const baro = Number(line.slice(25, 30));
      const gps = Number(line.slice(30, 35));
      if (valid && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
        points.push({ t: t + dayOffset, lat, lon, altitude: gps > 0 ? gps : baro });
      }
    }
  }
  return { date, pilotName, wing, points };
}

function analyze(p) {
  // Del sporet i perioder i bevegelse (fart over MIN_SPEED, målt over 10 sekunder for å dempe GPS-støy).
  // Står man stille i minst PAUSE sekunder, f.eks. for å pakke vingen, starter en ny periode. Flyturen er perioden
  // med det høyeste punktet, slik at kjøring hjem etter landing ikke telles med.
  const segments = [];
  let current = null;
  for (let i = 0, j = 0; i < p.length; i++) {
    while (j < p.length && p[j].t - p[i].t < 10) j++;
    if (j >= p.length) break;
    if (distance(p[i], p[j]) / (p[j].t - p[i].t) <= MIN_SPEED) continue;
    if (current && p[i].t - p[current.end].t < PAUSE) current.end = j;
    else segments.push((current = { start: i, end: j }));
  }
  const highest = (r) => p.slice(r.start, r.end + 1).reduce((m, x) => Math.max(m, x.altitude), -Infinity);
  const chosen = segments.sort((a, b) => highest(b) - highest(a))[0];
  if (!chosen || p[chosen.end].t - p[chosen.start].t < MIN_DURATION) return null;
  const flight = p.slice(chosen.start, chosen.end + 1);
  const max = flight.reduce((m, x) => Math.max(m, x.altitude), -Infinity);
  // Lengden på sporet. Sprang raskere enn 40 m/s er GPS-feil og telles ikke.
  let track = 0;
  for (let i = 1; i < flight.length; i++) {
    const d = distance(flight[i - 1], flight[i]);
    if (d / Math.max(1, flight[i].t - flight[i - 1].t) < 40) track += d;
  }
  return {
    track,
    seconds: flight.at(-1).t - flight[0].t,
    startTime: flight[0].t,
    maxAltitude: max,
    gain: Math.max(0, max - flight[0].altitude),
  };
}

const all = (await Promise.all(dirs.map(files))).flat();
const flights = [];
let others = 0;
let empty = 0;
for (const file of all) {
  const name = basename(file);
  const { date, pilotName, wing: headerWing, points } = parse(await readFile(file, 'latin1'));
  const p = pilotName.toLowerCase();
  if ((!UNKNOWN.has(p) && !p.includes(pilot)) || otherPilot(name)) { others++; continue; }
  const a = date && points.length > 10 ? analyze(points) : null;
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

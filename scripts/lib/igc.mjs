// Tolking og analyse av IGC-filer. Brukes av scripts/flight-stats.mjs og testes i tests/unit/.
// Rene funksjoner uten filer eller nettverk.

export const MIN_SPEED = 3; // m/s, grense for «i lufta»
export const MIN_DURATION = 60; // sekunder, kortere enn dette er ikke en tur
export const PAUSE = 120; // sekunder stillestående som skiller flyturen fra f.eks. kjøring etterpå

const rad = (deg) => (deg * Math.PI) / 180;
export function distance(a, b) {
  const R = 6371000;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function parseIgc(text) {
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

export function analyzeFlight(p) {
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

// Enhetstester for tolking og analyse av IGC-filer (scripts/lib/igc.mjs), med kunstige spor.
// Kjøres med «npm run test:unit».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distance, parseIgc, analyzeFlight } from '../../scripts/lib/igc.mjs';

// Lager en B-linje: tid i sekunder siden midnatt UTC, posisjon i desimalgrader, høyde i meter
function bRecord(seconds, lat, lon, altitude, valid = 'A') {
  const s = Math.floor(seconds) % 86400;
  const time = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join('');
  const coord = (value, degDigits, pos, neg) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const minThousandths = Math.round((abs - deg) * 60000);
    return String(deg).padStart(degDigits, '0') + String(minThousandths).padStart(5, '0') + (value < 0 ? neg : pos);
  };
  const alt = String(Math.round(altitude)).padStart(5, '0');
  return `B${time}${coord(lat, 2, 'N', 'S')}${coord(lon, 3, 'E', 'W')}${valid}${alt}${alt}`;
}

const header = ['AXXX', 'HFDTE301026', 'HFPLTPILOTINCHARGE:Testpilot', 'HFGTYGLIDERTYPE:Testvinge 2'];

test('distance gir avstand i meter', () => {
  // Ett bueminutt langs en meridian er omtrent én nautisk mil (1852 m)
  const d = distance({ lat: 68, lon: 16 }, { lat: 68 + 1 / 60, lon: 16 });
  assert.ok(Math.abs(d - 1853) < 5, `fikk ${d}`);
  assert.equal(distance({ lat: 68, lon: 16 }, { lat: 68, lon: 16 }), 0);
});

test('parseIgc leser dato, pilot, vinge og gyldige punkter', () => {
  const text = [...header,
    bRecord(36000, 68.8, 16.5, 500),
    bRecord(36001, 68.8, 16.5, 500, 'V'), // ugyldig GPS-fiks tas ikke med
    bRecord(36002, -33.9, -70.6, 600), // sør og vest gir negative koordinater
  ].join('\r\n');
  const r = parseIgc(text);
  assert.equal(r.date.toISOString().slice(0, 10), '2026-10-30');
  assert.equal(r.pilotName, 'Testpilot');
  assert.equal(r.wing, 'Testvinge 2');
  assert.equal(r.points.length, 2);
  assert.ok(r.points[1].lat < 0 && r.points[1].lon < 0);
  assert.equal(r.points[0].altitude, 500);
});

test('parseIgc håndterer turer over midnatt UTC', () => {
  const r = parseIgc([...header, bRecord(86398, 68.8, 16.5, 500), bRecord(2, 68.8, 16.5, 500)].join('\n'));
  assert.equal(r.points[1].t - r.points[0].t, 4);
});

// Kunstig tur: står stille i 3 min, flyr nordover i 20 min med 10 m/s og stigning til toppen, står stille i 5 min
// (pakker vingen), og kjører så raskt av gårde på lav høyde. Bare flyturen skal telles.
function syntheticTrack() {
  const points = [];
  let t = 36000;
  let lat = 68.8;
  const lon = 16.5;
  const metersPerDegree = 111320;
  for (let i = 0; i < 180; i++) points.push({ t: t++, lat, lon, altitude: 400 });
  for (let i = 0; i < 1200; i++) {
    lat += 10 / metersPerDegree;
    const altitude = i < 600 ? 400 + i : 1000 - (i - 600) * 1.5;
    points.push({ t: t++, lat, lon, altitude });
  }
  for (let i = 0; i < 300; i++) points.push({ t: t++, lat, lon, altitude: 100 });
  for (let i = 0; i < 600; i++) {
    lat += 20 / metersPerDegree;
    points.push({ t: t++, lat, lon, altitude: 50 });
  }
  return points;
}

test('analyzeFlight teller bare flyturen med det høyeste punktet', () => {
  const a = analyzeFlight(syntheticTrack());
  assert.ok(a, 'fant ingen tur');
  assert.equal(a.maxAltitude, 1000);
  assert.ok(Math.abs(a.seconds - 1200) <= 15, `flytid ${a.seconds} s`);
  assert.ok(Math.abs(a.track - 12000) < 300, `spor ${a.track} m`);
  assert.ok(a.gain >= 590 && a.gain <= 600, `høydegevinst ${a.gain} m`);
});

test('analyzeFlight ignorerer GPS-sprang og korte turer', () => {
  const points = syntheticTrack();
  // Ett punkt hopper 5 km og tilbake: sprang raskere enn 40 m/s skal ikke telles i sporet
  const i = 500;
  points[i] = { ...points[i], lat: points[i].lat + 5000 / 111320 };
  const a = analyzeFlight(points);
  assert.ok(Math.abs(a.track - 12000) < 300, `spor ${a.track} m`);

  const short = [];
  for (let k = 0; k < 40; k++) short.push({ t: 36000 + k, lat: 68.8 + (k * 10) / 111320, lon: 16.5, altitude: 400 + k });
  assert.equal(analyzeFlight(short), null);
});

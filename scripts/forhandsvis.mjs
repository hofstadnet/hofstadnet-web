// Lokal forhåndsvisning av den ferdig bygde siden (dist/), med de samme sikkerhetshodene som i drift.
// «astro preview» sender ikke hodene fra public/_headers, så feil i Content-Security-Policy
// ville ellers først blitt oppdaget etter publisering. Bruk: npm run forhandsvis
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import worker from '../worker/index.js';

const rot = resolve('dist');
const port = Number(process.env.PORT ?? 4330);

const typer = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

// Leser regelsettet for «/*» fra _headers
async function fellesHoder() {
  const hoder = {};
  const linjer = (await readFile(join(rot, '_headers'), 'utf8')).split(/\r?\n/);
  let aktiv = false;
  for (const linje of linjer) {
    if (/^\S/.test(linje) && !linje.startsWith('#')) { aktiv = linje.trim() === '/*'; continue; }
    const treff = aktiv && linje.match(/^\s+([^:\s]+):\s*(.+)$/);
    if (treff) hoder[treff[1]] = treff[2];
  }
  return hoder;
}
const hoder = await fellesHoder();

// Gjør en Node-forespørsel om til en Request for Workeren, med innholdet for POST (CSP-rapporter)
async function somRequest(req, sti) {
  const init = { method: req.method, headers: { 'Content-Type': req.headers['content-type'] ?? '' } };
  if (req.method === 'POST') {
    const deler = [];
    for await (const del of req) deler.push(del);
    init.body = Buffer.concat(deler);
  }
  return new Request(`http://localhost${sti}`, init);
}

createServer(async (req, res) => {
  const adresse = new URL(req.url ?? '/', 'http://x');
  const sti = decodeURIComponent(adresse.pathname);

  // Adresser under /api/ går til den samme Worker-koden som kjører hos Cloudflare (worker/index.js).
  // «?test=live» finnes bare her, for å kunne se den grønne visningen uten å være i lufta.
  if (sti.startsWith('/api/')) {
    const test = adresse.searchParams.get('test');
    const svar = test && sti === '/api/status'
      ? Response.json({ status: test, sjekket: new Date().toISOString() })
      : await worker.fetch(await somRequest(req, sti), {}, { waitUntil() {} });
    res.writeHead(svar.status, Object.fromEntries(svar.headers)).end(svar.body ? await svar.text() : undefined);
    return;
  }

  let fil = normalize(join(rot, sti));
  if (fil !== rot && !fil.startsWith(rot + sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(fil)).isDirectory()) fil = join(fil, 'index.html');
    const data = await readFile(fil);
    res.writeHead(200, { ...hoder, 'Content-Type': typer[extname(fil)] ?? 'application/octet-stream' }).end(data);
  } catch {
    const data = await readFile(join(rot, '404.html'));
    res.writeHead(404, { ...hoder, 'Content-Type': typer['.html'] }).end(data);
  }
}).listen(port, '127.0.0.1', () => console.log(`Forhåndsvisning på http://127.0.0.1:${port}`));

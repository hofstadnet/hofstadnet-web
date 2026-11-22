// Lokal forhåndsvisning av den ferdig bygde siden (dist/), med de samme sikkerhetshodene som i drift.
// «astro preview» sender ikke hodene fra public/_headers, så feil i Content-Security-Policy
// ville ellers først blitt oppdaget etter publisering. Bruk: npm run preview
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import worker from '../worker/index.js';

const root = resolve('dist');
const port = Number(process.env.PORT ?? 4330);

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

// Leser regelsettet for «/*» fra _headers
async function sharedHeaders() {
  const headers = {};
  const lines = (await readFile(join(root, '_headers'), 'utf8')).split(/\r?\n/);
  let active = false;
  for (const line of lines) {
    if (/^\S/.test(line) && !line.startsWith('#')) { active = line.trim() === '/*'; continue; }
    const match = active && line.match(/^\s+([^:\s]+):\s*(.+)$/);
    if (match) headers[match[1]] = match[2];
  }
  return headers;
}
const headers = await sharedHeaders();

// Gjør en Node-forespørsel om til en Request for Workeren, med innholdet for POST (CSP-rapporter)
async function toRequest(req, path) {
  const init = { method: req.method, headers: { 'Content-Type': req.headers['content-type'] ?? '' } };
  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    init.body = Buffer.concat(chunks);
  }
  return new Request(`http://localhost${path}`, init);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = decodeURIComponent(url.pathname);

  // Adresser under /api/ går til den samme Worker-koden som kjører hos Cloudflare (worker/index.js).
  // «?test=live» finnes bare her, for å kunne se den grønne visningen uten å være i lufta.
  if (path.startsWith('/api/')) {
    const test = url.searchParams.get('test');
    const response = test && path === '/api/status'
      ? Response.json({ status: test, checked: new Date().toISOString() })
      : await worker.fetch(await toRequest(req, path), {}, { waitUntil() {} });
    res.writeHead(response.status, Object.fromEntries(response.headers)).end(response.body ? await response.text() : undefined);
    return;
  }

  let file = normalize(join(root, path));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(data);
  } catch {
    const data = await readFile(join(root, '404.html'));
    res.writeHead(404, { ...headers, 'Content-Type': types['.html'] }).end(data);
  }
}).listen(port, '127.0.0.1', () => console.log(`Forhåndsvisning på http://127.0.0.1:${port}`));

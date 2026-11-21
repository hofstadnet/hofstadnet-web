// Cloudflare Worker for hofstad.net.
//
// Nesten alt på siden er statiske filer fra dist/, og dem leverer Cloudflare direkte uten å kjøre denne koden.
// Workeren kjøres bare for adresser under /api/ (se «run_worker_first» i wrangler.jsonc).
//
// GET /api/status svarer med {"status": "live" | "ikke-live" | "ukjent"} ut fra LiveTrack24 sin statusrute.
// Besøkende kontakter dermed aldri LiveTrack24 selv.
//
// Minst mulig angrepsflate:
//  - bare GET og HEAD, ingen parametere og ingen hemmeligheter
//  - adressen som hentes, er fast i koden og kan ikke påvirkes utenfra
//  - svaret mellomlagres i 60 sekunder, så trafikk til siden blir ikke til trafikk mot LiveTrack24
import { hentStatus } from '../src/lib/livetrack-status.js';

const SEKUNDER = 60;

// Hodene i public/_headers gjelder bare statiske filer. Svar som lages her, må sette sine egne.
const HODER = {
  'Content-Type': 'application/json; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

function json(data, status = 200, ekstra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...HODER, ...ekstra } });
}

async function status(request, ctx) {
  const cache = globalThis.caches?.default;
  const nokkel = new Request(new URL('/api/status', request.url).toString());

  if (cache) {
    const lagret = await cache.match(nokkel);
    if (lagret) return lagret;
  }

  const svar = json(await hentStatus(fetch), 200, { 'Cache-Control': `public, max-age=${SEKUNDER}` });
  if (cache) ctx.waitUntil(cache.put(nokkel, svar.clone()));
  return svar;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      if (pathname !== '/api/status') return json({ feil: 'Finnes ikke' }, 404, { 'Cache-Control': 'no-store' });
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ feil: 'Metoden støttes ikke' }, 405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
      }
      return status(request, ctx);
    }

    // Alt annet er statiske filer
    return env.ASSETS.fetch(request);
  },
};

// Cloudflare Worker for hofstad.net.
//
// Nesten alt på siden er statiske filer fra dist/, og dem leverer Cloudflare direkte uten å kjøre denne koden.
// Workeren kjøres bare for adresser under /api/ (se «run_worker_first» i wrangler.jsonc).
//
// GET /api/status svarer med {"status": "live" | "not-live" | "unknown", "checked": "<tidspunkt>"} ut fra
// LiveTrack24 sin statusrute. Besøkende kontakter dermed aldri LiveTrack24 selv.
//
// POST /api/csp tar imot rapporter om brudd på Content-Security-Policy og Trusted Types (se csp-report.js).
//
// Minst mulig angrepsflate:
//  - bare GET og HEAD på /api/status og bare POST på /api/csp, ingen parametere og ingen hemmeligheter
//  - begge adressene har rate limiting per IP i Cloudflare (infra/hofstad.net/terraform.tfvars)
//  - adressen som hentes, er fast i koden og kan ikke påvirkes utenfra
//  - svaret mellomlagres i 60 sekunder, så trafikk til siden blir ikke til trafikk mot LiveTrack24
//
// Logger: én linje per kall med console.log, for eksempel «api path=/api/status status=200 result=not-live cache=hit».
// Bare faste verdier: adressen (eller «other» for ukjente adresser under /api/), statuskode, resultat og antall
// rapporter. Aldri IP, nettleserinfo, spørrestrenger eller innhold fra forespørselen. Cloudflares egen logg per kall
// (invocation_logs) og sporing er slått av i wrangler.jsonc, fordi de tar med slike opplysninger.
import { fetchStatus } from '../src/lib/livetrack-status.js';
import { handleCspReport } from './csp-report.js';

const CACHE_SECONDS = 60;

// Hodene i public/_headers gjelder bare statiske filer. Svar som lages her, må sette sine egne.
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, ...extra } });
}

async function status(request, ctx) {
  const cache = globalThis.caches?.default;
  const key = new Request(new URL('/api/status', request.url).toString());

  if (cache) {
    const cached = await cache.match(key);
    if (cached) return { response: cached, log: { result: await result(cached), cache: 'hit' } };
  }

  const data = await fetchStatus(fetch);
  const response = json(data, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
  if (cache) ctx.waitUntil(cache.put(key, response.clone()));
  return { response, log: { result: data.status, cache: cache ? 'miss' : 'none' } };
}

// Statusen i et mellomlagret svar, til loggen
async function result(response) {
  try {
    const { status } = await response.clone().json();
    return ['live', 'not-live', 'unknown'].includes(status) ? status : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Lager logglinjen. Bare nøklene og verdiene som sendes inn, og de er faste verdier fra koden. */
export function logLine(fields) {
  return ['api', ...Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`)].join(' ');
}

async function api(request, ctx, pathname) {
  if (pathname === '/api/csp') {
    if (request.method !== 'POST') {
      return { response: json({ error: 'Metoden støttes ikke' }, 405, { Allow: 'POST', 'Cache-Control': 'no-store' }) };
    }
    const reports = await handleCspReport(request);
    return { response: new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }), log: { reports } };
  }
  if (pathname !== '/api/status') {
    return { response: json({ error: 'Finnes ikke' }, 404, { 'Cache-Control': 'no-store' }) };
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return { response: json({ error: 'Metoden støttes ikke' }, 405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' }) };
  }
  return status(request, ctx);
}

const KNOWN = new Set(['/api/status', '/api/csp']);

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      const { response, log } = await api(request, ctx, pathname);
      // Ukjente adresser logges som «other», så tekst fra adressen aldri havner i loggen
      console.log(logLine({ path: KNOWN.has(pathname) ? pathname : 'other', status: response.status, ...log }));
      return response;
    }

    // Alt annet er statiske filer
    return env.ASSETS.fetch(request);
  },
};

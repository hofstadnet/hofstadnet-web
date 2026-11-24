// POST /api/csp tar imot rapporter fra nettleseren når Content-Security-Policy eller Trusted Types stopper noe
// (se report-uri/report-to i public/_headers). Rapportene skrives til Workers Logs med console.error, så en ny type
// brudd blir en «issue» i Workers Observability og gir e-postvarsel.
//
// Personvern og angrepsflate:
//  - ingen IP-adresse, nettleserinfo eller spørrestrenger lagres, bare side, direktiv og hvor det blokkerte kom fra
//  - «sample» (utdrag av blokkert kode) lagres ikke, fordi det kan inneholde tekst fra siden eller skjemaer
//  - maks 16 kB per forespørsel, også uten Content-Length (body.js), og maks 10 rapporter per forespørsel
//  - brudd fra nettleserutvidelser og andre opphav enn siden selv ignoreres, de er ikke feil på siden
//  - svaret er alltid 204 uten innhold, så endepunktet kan ikke brukes til å hente noe (svaret lages i index.js)

import { readLimitedBody } from './body.js';

const MAX_BYTES = 16 * 1024;
const MAX_REPORTS = 10;
const HOSTS = new Set(['hofstad.net', 'www.hofstad.net', 'localhost', '127.0.0.1']);
// Direktivet logges bare når det er et kjent navn, så rapporten ikke kan legge fritekst i loggen
const DIRECTIVES = new Set([
  'default-src', 'script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr',
  'img-src', 'font-src', 'connect-src', 'media-src', 'object-src', 'frame-src', 'child-src', 'worker-src',
  'manifest-src', 'base-uri', 'form-action', 'frame-ancestors', 'upgrade-insecure-requests',
  'require-trusted-types-for', 'trusted-types',
]);

// Gjør en adresse om til opphav + sti (uten spørrestreng og fragment), eller et nøkkelord som «inline»
function shorten(value) {
  if (typeof value !== 'string' || value === '') return undefined;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return value.slice(0, 40);
  try {
    const u = new URL(value);
    if (u.protocol === 'http:' || u.protocol === 'https:') return `${u.origin}${u.pathname}`.slice(0, 200);
    return `${u.protocol}`;
  } catch {
    return undefined;
  }
}

function isFromSite(url) {
  try { return HOSTS.has(new URL(url).hostname); } catch { return false; }
}

// Støtter både Reporting API (application/reports+json, en liste) og det eldre report-uri (application/csp-report)
function parseReports(data) {
  const list = Array.isArray(data) ? data : [data];
  return list.slice(0, MAX_REPORTS).map((r) => {
    const b = r?.body ?? r?.['csp-report'] ?? {};
    return {
      page: b.documentURL ?? b['document-uri'],
      directive: b.effectiveDirective ?? b['effective-directive'] ?? b['violated-directive'],
      blocked: b.blockedURL ?? b['blocked-uri'],
      source: b.sourceFile ?? b['source-file'],
      line: b.lineNumber ?? b['line-number'],
      column: b.columnNumber ?? b['column-number'],
      disposition: b.disposition,
    };
  });
}

/**
 * Logger bruddene i forespørselen og gir antallet som ble logget (0 når forespørselen avvises eller ignoreres).
 * @param {Request} request
 * @returns {Promise<number>}
 */
export async function handleCspReport(request) {
  // Avviser tidlig når hodet sier at kroppen er for stor. Den harde grensen gjelder når kroppen leses under.
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BYTES) return 0;

  let data;
  try {
    const body = await readLimitedBody(request, MAX_BYTES);
    if (body === null) return 0;
    data = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return 0;
  }

  let logged = 0;

  for (const r of parseReports(data)) {
    if (!isFromSite(r.page)) continue;
    const source = shorten(r.source);
    // Utvidelser i nettleseren (chrome-extension:, moz-extension: …) er ikke feil på siden
    if (source && !/^https?:/.test(source) && source.endsWith(':')) continue;
    console.error(JSON.stringify({
      type: 'csp-violation',
      page: shorten(r.page),
      // Eldre rapporter (violated-directive) kan ha verdiene etter navnet, f.eks. «img-src 'self'»
      directive: DIRECTIVES.has(String(r.directive ?? '').split(' ')[0]) ? String(r.directive).split(' ')[0] : 'other',
      blocked: shorten(r.blocked),
      source,
      line: Number.isFinite(r.line) ? r.line : undefined,
      column: Number.isFinite(r.column) ? r.column : undefined,
      disposition: r.disposition === 'report' ? 'report' : 'enforce',
    }));
    logged += 1;
  }
  return logged;
}

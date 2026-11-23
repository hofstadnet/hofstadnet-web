// POST /api/csp tar imot rapporter fra nettleseren når Content-Security-Policy eller Trusted Types stopper noe
// (se report-uri/report-to i public/_headers). Rapportene skrives til Workers Logs med console.error, så en ny type
// brudd blir en «issue» i Workers Observability og gir e-postvarsel.
//
// Personvern og angrepsflate:
//  - ingen IP-adresse, nettleserinfo eller spørrestrenger lagres, bare side, direktiv og hvor det blokkerte kom fra
//  - «sample» (utdrag av blokkert kode) lagres ikke, fordi det kan inneholde tekst fra siden eller skjemaer
//  - maks 16 kB per forespørsel og maks 10 rapporter per forespørsel
//  - brudd fra nettleserutvidelser og andre opphav enn siden selv ignoreres, de er ikke feil på siden
//  - svaret er alltid 204 uten innhold, så endepunktet kan ikke brukes til å hente noe (svaret lages i index.js)

const MAX_BYTES = 16 * 1024;
const MAX_REPORTS = 10;
const HOSTS = new Set(['hofstad.net', 'www.hofstad.net', 'localhost', '127.0.0.1']);

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
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BYTES) return 0;
  const text = await request.text();
  if (text.length > MAX_BYTES) return 0;

  let data;
  try { data = JSON.parse(text); } catch { return 0; }

  let logged = 0;

  for (const r of parseReports(data)) {
    if (!isFromSite(r.page)) continue;
    const source = shorten(r.source);
    // Utvidelser i nettleseren (chrome-extension:, moz-extension: …) er ikke feil på siden
    if (source && !/^https?:/.test(source) && source.endsWith(':')) continue;
    console.error(JSON.stringify({
      type: 'csp-violation',
      page: shorten(r.page),
      directive: typeof r.directive === 'string' ? r.directive.slice(0, 60) : undefined,
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

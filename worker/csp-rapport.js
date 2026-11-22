// POST /api/csp tar imot rapporter fra nettleseren når Content-Security-Policy eller Trusted Types stopper noe
// (se report-uri/report-to i public/_headers). Rapportene skrives til Workers Logs med console.error, så en ny type
// brudd blir en «issue» i Workers Observability og gir e-postvarsel.
//
// Personvern og angrepsflate:
//  - ingen IP-adresse, nettleserinfo eller spørrestrenger lagres, bare side, direktiv og hvor det blokkerte kom fra
//  - «sample» (utdrag av blokkert kode) lagres ikke, fordi det kan inneholde tekst fra siden eller skjemaer
//  - maks 16 kB per forespørsel og maks 10 rapporter per forespørsel
//  - brudd fra nettleserutvidelser og andre opphav enn siden selv ignoreres, de er ikke feil på siden
//  - svaret er alltid 204 uten innhold, så endepunktet kan ikke brukes til å hente noe

const MAKS_BYTE = 16 * 1024;
const MAKS_RAPPORTER = 10;
const VERTER = new Set(['hofstad.net', 'www.hofstad.net', 'localhost', '127.0.0.1']);

// Gjør en adresse om til opphav + sti (uten spørrestreng og fragment), eller et nøkkelord som «inline»
function forkort(verdi) {
  if (typeof verdi !== 'string' || verdi === '') return undefined;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(verdi)) return verdi.slice(0, 40);
  try {
    const u = new URL(verdi);
    if (u.protocol === 'http:' || u.protocol === 'https:') return `${u.origin}${u.pathname}`.slice(0, 200);
    return `${u.protocol}`;
  } catch {
    return undefined;
  }
}

function fraSiden(adresse) {
  try { return VERTER.has(new URL(adresse).hostname); } catch { return false; }
}

// Støtter både Reporting API (application/reports+json, en liste) og det eldre report-uri (application/csp-report)
function tolk(data) {
  const liste = Array.isArray(data) ? data : [data];
  return liste.slice(0, MAKS_RAPPORTER).map((r) => {
    const b = r?.body ?? r?.['csp-report'] ?? {};
    return {
      side: b.documentURL ?? b['document-uri'],
      direktiv: b.effectiveDirective ?? b['effective-directive'] ?? b['violated-directive'],
      blokkert: b.blockedURL ?? b['blocked-uri'],
      kilde: b.sourceFile ?? b['source-file'],
      linje: b.lineNumber ?? b['line-number'],
      kolonne: b.columnNumber ?? b['column-number'],
      modus: b.disposition,
    };
  });
}

/** @param {Request} request */
export async function cspRapport(request) {
  const tom = new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  const lengde = Number(request.headers.get('Content-Length') ?? 0);
  if (lengde > MAKS_BYTE) return tom;
  const tekst = await request.text();
  if (tekst.length > MAKS_BYTE) return tom;

  let data;
  try { data = JSON.parse(tekst); } catch { return tom; }

  for (const r of tolk(data)) {
    if (!fraSiden(r.side)) continue;
    const kilde = forkort(r.kilde);
    // Utvidelser i nettleseren (chrome-extension:, moz-extension: …) er ikke feil på siden
    if (kilde && !/^https?:/.test(kilde) && kilde.endsWith(':')) continue;
    console.error(JSON.stringify({
      type: 'csp-brudd',
      side: forkort(r.side),
      direktiv: typeof r.direktiv === 'string' ? r.direktiv.slice(0, 60) : undefined,
      blokkert: forkort(r.blokkert),
      kilde,
      linje: Number.isFinite(r.linje) ? r.linje : undefined,
      kolonne: Number.isFinite(r.kolonne) ? r.kolonne : undefined,
      modus: r.modus === 'report' ? 'report' : 'enforce',
    }));
  }
  return tom;
}

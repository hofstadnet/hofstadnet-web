// Felles søk med Pagefind sitt JavaScript-API. Brukes av søkefeltet i menyen (search-panel.js) og av
// reservesiden /sok/ (search-page.js). Indeksen lastes først når noen faktisk søker.
// Pagefind lager én indeks per språk ut fra <html lang>, og søker i indeksen for språket til siden man er på.

// Trusted Types (se public/_headers) stopper skriptadresser satt fra tekst. Pagefind starter søket i en egen
// tråd med new Worker('/pagefind/pagefind-worker.js'). Denne policyen slipper gjennom akkurat den adressen fra
// egen side og ingen andre. Den lager ikke HTML, så innerHTML o.l. er fortsatt sperret.
if (globalThis.trustedTypes?.createPolicy) {
  try {
    globalThis.trustedTypes.createPolicy('default', {
      createScriptURL(u) {
        const url = new URL(u, location.href);
        return url.origin === location.origin && url.pathname === '/pagefind/pagefind-worker.js' ? url.href : null;
      },
    });
  } catch { /* policyen finnes allerede */ }
}

let pagefind;
async function load() {
  // Adressen settes sammen her, så Vite ikke prøver å pakke filen som bare finnes etter bygget
  const path = ['/pagefind', 'pagefind.js'].join('/');
  pagefind ??= await import(/* @vite-ignore */ path);
  return pagefind;
}

// Utdragene fra Pagefind er tekst med <mark> rundt treffordene. De gjøres om til tekstnoder og <mark>-elementer,
// aldri til HTML, så Trusted Types (se public/_headers) kan forby innsetting av HTML på hele siden.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: String.fromCharCode(160) };
const decode = (t) => t.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e) => ENTITIES[e]);

/** @param {string} html @returns {Node[]} */
function excerptNodes(html) {
  const nodes = [];
  let marked = false;
  for (const part of html.split(/(<\/?mark>)/)) {
    if (part === '<mark>') marked = true;
    else if (part === '</mark>') marked = false;
    else if (part) {
      const text = decode(part);
      if (marked) { const m = document.createElement('mark'); m.textContent = text; nodes.push(m); }
      else nodes.push(document.createTextNode(text));
    }
  }
  return nodes;
}

/**
 * Søker og returnerer { count, results: [{ url, title, excerpt }] }, eller null hvis et nyere søk har tatt over.
 * @param {string} q @param {number} max
 */
export async function search(q, max = 20) {
  const pf = await load();
  const response = await pf.debouncedSearch(q, {}, 150);
  if (response === null) return null;
  const data = await Promise.all(response.results.slice(0, max).map((r) => r.data()));
  return {
    count: response.results.length,
    results: data.map((r) => ({ url: r.url, title: r.meta?.title ?? r.url, excerpt: r.excerpt ?? '' })),
  };
}

/** Lager listepunkter for treffene. Ingenting settes inn som HTML. */
export function resultList(results) {
  return results.map((r) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = r.url;
    a.textContent = r.title;
    const p = document.createElement('p');
    p.append(...excerptNodes(r.excerpt));
    li.append(a, p);
    return li;
  });
}

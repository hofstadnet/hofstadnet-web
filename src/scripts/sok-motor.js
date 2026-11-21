// Felles søk med Pagefind sitt JavaScript-API. Brukes av søkefeltet i menyen (sokepanel.js) og av
// reservesiden /sok/ (sok.js). Indeksen lastes først når noen faktisk søker.

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
async function last() {
  // Adressen settes sammen her, så Vite ikke prøver å pakke filen som bare finnes etter bygget
  const sti = ['/pagefind', 'pagefind.js'].join('/');
  pagefind ??= await import(/* @vite-ignore */ sti);
  return pagefind;
}

// Utdragene fra Pagefind er tekst med <mark> rundt treffordene. De gjøres om til tekstnoder og <mark>-elementer,
// aldri til HTML, så Trusted Types (se public/_headers) kan forby innsetting av HTML på hele siden.
const ENTITETER = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: String.fromCharCode(160) };
const dekod = (t) => t.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e) => ENTITETER[e]);

/** @param {string} html @returns {Node[]} */
function utdragsnoder(html) {
  const noder = [];
  let merket = false;
  for (const del of html.split(/(<\/?mark>)/)) {
    if (del === '<mark>') merket = true;
    else if (del === '</mark>') merket = false;
    else if (del) {
      const tekst = dekod(del);
      if (merket) { const m = document.createElement('mark'); m.textContent = tekst; noder.push(m); }
      else noder.push(document.createTextNode(tekst));
    }
  }
  return noder;
}

/**
 * Søker og returnerer { antall, treff: [{ url, tittel, utdrag }] }, eller null hvis et nyere søk har tatt over.
 * @param {string} q @param {number} maks
 */
export async function sok(q, maks = 20) {
  const pf = await last();
  const svar = await pf.debouncedSearch(q, {}, 150);
  if (svar === null) return null;
  const data = await Promise.all(svar.results.slice(0, maks).map((r) => r.data()));
  return {
    antall: svar.results.length,
    treff: data.map((t) => ({ url: t.url, tittel: t.meta?.title ?? t.url, utdrag: t.excerpt ?? '' })),
  };
}

/** Lager listepunkter for treffene. Ingenting settes inn som HTML. */
export function treffliste(treff) {
  return treff.map((t) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = t.url;
    a.textContent = t.tittel;
    const p = document.createElement('p');
    p.append(...utdragsnoder(t.utdrag));
    li.append(a, p);
    return li;
  });
}

// Felles søk med Pagefind sitt JavaScript-API. Brukes av søkefeltet i menyen (sokepanel.js) og av
// reservesiden /sok/ (sok.js). Indeksen lastes først når noen faktisk søker.

let pagefind;
async function last() {
  // Adressen settes sammen her, så Vite ikke prøver å pakke filen som bare finnes etter bygget
  const sti = ['/pagefind', 'pagefind.js'].join('/');
  pagefind ??= await import(/* @vite-ignore */ sti);
  return pagefind;
}

// Utdragene fra Pagefind er HTML med <mark> rundt treffordene. Alt annet escapes.
function rensUtdrag(html) {
  return html
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');
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
    treff: data.map((t) => ({ url: t.url, tittel: t.meta?.title ?? t.url, utdrag: rensUtdrag(t.excerpt ?? '') })),
  };
}

/** Lager listepunkter for treffene. Bare utdraget settes som HTML, og det er renset over. */
export function treffliste(treff) {
  return treff.map((t) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = t.url;
    a.textContent = t.tittel;
    const p = document.createElement('p');
    p.innerHTML = t.utdrag;
    li.append(a, p);
    return li;
  });
}

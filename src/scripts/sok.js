// Søk i innleggene med Pagefind sitt JavaScript-API. Indeksen lastes først når søkesiden åpnes.
// Utdragene fra Pagefind er HTML med <mark> rundt treffordene. Alt annet escapes før det settes inn.
const skjema = document.querySelector('[data-sok]');
const felt = document.getElementById('sok-felt');
const status = document.querySelector('[data-sok-status]');
const liste = document.querySelector('[data-sok-treff]');

// Tillat bare <mark> fra utdraget, alt annet blir tekst
const rensUtdrag = (html) =>
  html
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');

let pagefind;
async function last() {
  // Adressen settes sammen her, så Vite ikke prøver å pakke filen som bare finnes etter bygget
  const sti = ['/pagefind', 'pagefind.js'].join('/');
  pagefind ??= await import(/* @vite-ignore */ sti);
  return pagefind;
}

let teller = 0;
async function sok(ord) {
  const denne = ++teller;
  const q = ord.trim();
  const url = new URL(location.href);
  if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
  history.replaceState(null, '', url);

  if (!q) { liste.replaceChildren(); status.textContent = ''; return; }
  status.textContent = 'Søker …';
  try {
    const pf = await last();
    const svar = await pf.debouncedSearch(q, {}, 200);
    if (svar === null || denne !== teller) return; // et nyere søk er på vei
    const treff = await Promise.all(svar.results.slice(0, 20).map((r) => r.data()));
    if (denne !== teller) return;
    liste.replaceChildren(...treff.map((t) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = t.url;
      a.textContent = t.meta?.title ?? t.url;
      const p = document.createElement('p');
      p.innerHTML = rensUtdrag(t.excerpt ?? '');
      li.append(a, p);
      return li;
    }));
    const n = svar.results.length;
    status.textContent = n === 0 ? `Ingen treff for «${q}».` : `${n} treff for «${q}».`;
  } catch {
    status.textContent = 'Søket er ikke tilgjengelig akkurat nå.';
  }
}

if (skjema && felt && status && liste) {
  skjema.addEventListener('submit', (e) => { e.preventDefault(); sok(felt.value); });
  felt.addEventListener('input', () => sok(felt.value));
  const fraAdresse = new URLSearchParams(location.search).get('q');
  if (fraAdresse) { felt.value = fraAdresse; sok(fraAdresse); }
}

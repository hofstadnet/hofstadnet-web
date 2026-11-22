// Reservesiden /sok/ (engelsk: /en/search/). Brukes når søkefeltet i menyen ikke er tilgjengelig, av søket på 404-siden og av
// søkefeltet i Google-treffet (strukturert data). Leser ?q= fra adressen.
import { search, resultList } from './search-engine.js';
import { strings } from '../i18n/client';

const text = strings().search;

const form = document.querySelector('[data-search]');
const input = document.getElementById('search-input');
const status = document.querySelector('[data-search-status]');
const list = document.querySelector('[data-search-results]');

let counter = 0;
async function run(terms) {
  const current = ++counter;
  const q = terms.trim();
  const url = new URL(location.href);
  if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
  history.replaceState(null, '', url);

  if (!q) { list.replaceChildren(); status.textContent = ''; return; }
  status.textContent = text.searching;
  try {
    const response = await search(q);
    if (response === null || current !== counter) return;
    list.replaceChildren(...resultList(response.results));
    status.textContent = response.count === 0 ? text.noResults(q) : text.resultsFor(response.count, q);
  } catch {
    status.textContent = text.unavailable;
  }
}

if (form && input && status && list) {
  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
  input.addEventListener('input', () => run(input.value));
  const fromUrl = new URLSearchParams(location.search).get('q');
  if (fromUrl) { input.value = fromUrl; run(fromUrl); }
}

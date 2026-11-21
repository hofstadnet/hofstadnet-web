// Bryteren for lys/mørk visning. Valget lagres lokalt i nettleseren, uten cookies eller nettverkskall.
// Selve temaet settes av /tema.js før siden tegnes; her holdes bryteren i takt og valget lagres.
// Har man ikke valgt selv, følger siden operativsystemet, også når innstillingen endres mens siden er åpen.
const root = document.documentElement;
const KEY = 'hofstadnet-color-mode';

function sync() {
  const dark = root.dataset.theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-checked', String(dark));
    b.setAttribute('aria-label', dark ? 'Bytt til lys visning' : 'Bytt til mørk visning');
  });
}

document.addEventListener('click', (e) => {
  const b = e.target instanceof Element ? e.target.closest('[data-theme-toggle]') : null;
  if (!b) return;
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, root.dataset.theme); } catch {}
  sync();
});

const system = window.matchMedia?.('(prefers-color-scheme: light)');
system?.addEventListener('change', (e) => {
  let lagret = null;
  try { lagret = localStorage.getItem(KEY); } catch {}
  if (lagret === 'light' || lagret === 'dark') return;
  root.dataset.theme = e.matches ? 'light' : 'dark';
  sync();
});

sync();

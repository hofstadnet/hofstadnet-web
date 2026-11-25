// Bryteren for lys/mørk visning. Valget lagres lokalt i nettleseren, uten cookies eller nettverkskall.
// Selve temaet settes av /theme.js før siden tegnes; her holdes bryteren i takt og valget lagres.
// Har man ikke valgt selv, er visningen mørk, uansett innstillingen i operativsystemet.
import { strings } from '../i18n/client';

const root = document.documentElement;
const text = strings().theme;
const KEY = 'hofstadnet-color-mode';

function sync() {
  const dark = root.dataset.theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-checked', String(dark));
    b.setAttribute('aria-label', dark ? text.toLight : text.toDark);
  });
}

document.addEventListener('click', (e) => {
  const b = e.target instanceof Element ? e.target.closest('[data-theme-toggle]') : null;
  if (!b) return;
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, root.dataset.theme); } catch {}
  sync();
});

sync();

// Søkefeltet i menyen. «Søk» åpner et felt rett under menyen med treff mens man skriver.
// Uten JavaScript er «Søk» en vanlig lenke til /sok/.
//
// Panelet er en popover, så det vises i nettleserens øverste lag over toppbildet og kortene. Det plasseres
// under menyen med top/left/width via CSSOM (element.style), som CSP-en tillater.
//
// Tastatur: «/» åpner søket (når man ikke skriver i et felt), Esc lukker og setter fokus tilbake på knappen,
// pil opp og ned flytter mellom feltet og treffene, Enter går til første treff.
import { search, resultList, preload } from './search-engine.js';
import { strings } from '../i18n/client';

const text = strings().search;

const button = document.querySelector('[data-search-open]');
const panel = document.getElementById('search-panel');
const menu = button?.closest('header');
const input = panel?.querySelector('input');
const status = panel?.querySelector('[data-search-panel-status]');
const list = panel?.querySelector('[data-search-panel-results]');
const closeButton = panel?.querySelector('[data-search-panel-close]');

const supported = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const isOpen = () => panel.matches(':popover-open');

// Høyrekanten flukter med menyen, og panelet ligger rett under den
function position() {
  const m = menu.getBoundingClientRect();
  const width = Math.min(520, m.width);
  panel.style.width = `${width}px`;
  panel.style.left = `${Math.max(8, m.right - width)}px`;
  panel.style.top = `${Math.max(8, m.bottom - 6)}px`;
}

function open() {
  preload();
  if (!isOpen()) panel.showPopover();
  position();
  button.setAttribute('aria-expanded', 'true');
  input.focus();
  input.select();
}

function close(returnFocus = true) {
  if (!isOpen()) return;
  panel.hidePopover();
  button.setAttribute('aria-expanded', 'false');
  if (returnFocus) button.focus();
}

let counter = 0;
// Søketeksten som treffene i listen hører til. Enter åpner bare et treff når den er lik teksten i feltet.
let shownFor = '';
async function run() {
  const current = ++counter;
  const q = input.value.trim();
  if (!q) { list.replaceChildren(); status.textContent = ''; shownFor = ''; return; }
  status.textContent = text.searching;
  try {
    const response = await search(q, 8);
    if (response === null || current !== counter) return;
    list.replaceChildren(...resultList(response.results));
    shownFor = q;
    if (response.count === 0) status.textContent = text.noResults(q);
    else if (response.count > response.results.length) status.textContent = text.showing(response.results.length, response.count);
    else status.textContent = text.results(response.count);
  } catch {
    status.textContent = text.unavailable;
  }
}

// Eldre nettlesere uten popover får vanlig lenke til /sok/
if (supported && button && panel && menu && input && status && list) {
  button.setAttribute('role', 'button');
  button.addEventListener('click', (e) => {
    e.preventDefault();
    if (isOpen()) close(); else open();
  });
  // En lenke med role="button" må også reagere på Mellomrom, slik en vanlig knapp gjør
  button.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;
    e.preventDefault();
    if (isOpen()) close(); else open();
  });
  closeButton?.addEventListener('click', () => close());
  input.addEventListener('input', run);
  // Enter går til første treff, men bare når treffene hører til teksten i feltet. Står det gamle treff i listen
  // fordi et nytt søk ikke er ferdig, søkes det først.
  panel.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q && shownFor !== q) await run();
    const first = shownFor === q ? list.querySelector('a') : null;
    if (first) location.href = first.href;
  });

  document.addEventListener('keydown', (e) => {
    const inField = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName));
    if (e.key === '/' && !inField && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && isOpen()) close();
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isOpen() && panel.contains(e.target)) {
      // Pil opp og ned flytter mellom søkefeltet og treffene
      const stops = [input, ...list.querySelectorAll('a')];
      const here = stops.indexOf(e.target);
      if (here === -1) return;
      const next = e.key === 'ArrowDown' ? Math.min(here + 1, stops.length - 1) : Math.max(here - 1, 0);
      e.preventDefault();
      stops[next].focus();
    }
  });

  // Klikk utenfor lukker. Ved rulling og ny vindusstørrelse følger panelet menyen.
  document.addEventListener('click', (e) => {
    if (isOpen() && !panel.contains(e.target) && !button.contains(e.target)) close(false);
  });
  let pending = false;
  const follow = () => {
    if (pending || !isOpen()) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; position(); });
  };
  addEventListener('scroll', follow, { passive: true });
  addEventListener('resize', follow);
}

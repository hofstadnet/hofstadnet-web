// Søkefeltet i menyen. «Søk» åpner et felt rett under menyen med treff mens man skriver.
// Uten JavaScript er «Søk» en vanlig lenke til /sok/.
//
// Panelet er en popover, så det vises i nettleserens øverste lag over toppbildet og kortene. Det plasseres
// under menyen med top/left/width via CSSOM (element.style), som CSP-en tillater.
//
// Tastatur: «/» åpner søket (når man ikke skriver i et felt), Esc lukker og setter fokus tilbake på knappen,
// pil ned fra feltet går til første treff, Enter går til første treff.
import { sok, treffliste } from './sok-motor.js';

const knapp = document.querySelector('[data-sok-apne]');
const panel = document.getElementById('sokepanel');
const meny = knapp?.closest('header');
const felt = panel?.querySelector('input');
const status = panel?.querySelector('[data-sokepanel-status]');
const liste = panel?.querySelector('[data-sokepanel-treff]');
const lukk = panel?.querySelector('[data-sokepanel-lukk]');

const stottet = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const erApen = () => panel.matches(':popover-open');

// Høyrekanten flukter med menyen, og panelet ligger rett under den
function plasser() {
  const m = meny.getBoundingClientRect();
  const bredde = Math.min(520, m.width);
  panel.style.width = `${bredde}px`;
  panel.style.left = `${Math.max(8, m.right - bredde)}px`;
  panel.style.top = `${Math.max(8, m.bottom - 6)}px`;
}

function apne() {
  if (!erApen()) panel.showPopover();
  plasser();
  knapp.setAttribute('aria-expanded', 'true');
  felt.focus();
  felt.select();
}

function steng(tilbakeTilKnapp = true) {
  if (!erApen()) return;
  panel.hidePopover();
  knapp.setAttribute('aria-expanded', 'false');
  if (tilbakeTilKnapp) knapp.focus();
}

let teller = 0;
async function kjor() {
  const denne = ++teller;
  const q = felt.value.trim();
  if (!q) { liste.replaceChildren(); status.textContent = ''; return; }
  status.textContent = 'Søker …';
  try {
    const svar = await sok(q, 8);
    if (svar === null || denne !== teller) return;
    liste.replaceChildren(...treffliste(svar.treff));
    if (svar.antall === 0) status.textContent = `Ingen treff for «${q}».`;
    else if (svar.antall > svar.treff.length) status.textContent = `Viser ${svar.treff.length} av ${svar.antall} treff.`;
    else status.textContent = `${svar.antall} treff.`;
  } catch {
    status.textContent = 'Søket er ikke tilgjengelig akkurat nå.';
  }
}

// Eldre nettlesere uten popover får vanlig lenke til /sok/
if (stottet && knapp && panel && meny && felt && status && liste) {
  knapp.setAttribute('role', 'button');
  knapp.addEventListener('click', (e) => {
    e.preventDefault();
    if (erApen()) steng(); else apne();
  });
  lukk?.addEventListener('click', () => steng());
  felt.addEventListener('input', kjor);
  panel.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const forste = liste.querySelector('a');
    if (forste) location.href = forste.href;
  });

  document.addEventListener('keydown', (e) => {
    const iFelt = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName));
    if (e.key === '/' && !iFelt && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); apne(); }
    else if (e.key === 'Escape' && erApen()) steng();
    else if (e.key === 'ArrowDown' && e.target === felt) { e.preventDefault(); liste.querySelector('a')?.focus(); }
  });

  // Klikk utenfor lukker. Ved rulling og ny vindusstørrelse følger panelet menyen.
  document.addEventListener('click', (e) => {
    if (erApen() && !panel.contains(e.target) && !knapp.contains(e.target)) steng(false);
  });
  let venter = false;
  const folg = () => {
    if (venter || !erApen()) return;
    venter = true;
    requestAnimationFrame(() => { venter = false; plasser(); });
  };
  addEventListener('scroll', folg, { passive: true });
  addEventListener('resize', folg);
}

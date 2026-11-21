// Søkefeltet i menyen. «Søk» åpner et felt rett under menyen med treff mens man skriver.
// Uten JavaScript er «Søk» en vanlig lenke til /sok/.
//
// Tastatur: «/» åpner søket (når man ikke skriver i et felt), Esc lukker og setter fokus tilbake på knappen,
// pil ned fra feltet går til første treff.
import { sok, treffliste } from './sok-motor.js';

const knapp = document.querySelector('[data-sok-apne]');
const panel = document.getElementById('sokepanel');
const felt = panel?.querySelector('input');
const status = panel?.querySelector('[data-sokepanel-status]');
const liste = panel?.querySelector('[data-sokepanel-treff]');
const lukk = panel?.querySelector('[data-sokepanel-lukk]');

function apne() {
  panel.hidden = false;
  knapp.setAttribute('aria-expanded', 'true');
  felt.focus();
  felt.select();
}

function steng(tilbakeTilKnapp = true) {
  if (panel.hidden) return;
  panel.hidden = true;
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

if (knapp && panel && felt && status && liste) {
  // Med JavaScript er lenken en knapp som åpner panelet
  knapp.setAttribute('role', 'button');
  knapp.addEventListener('click', (e) => {
    e.preventDefault();
    if (panel.hidden) apne(); else steng();
  });
  lukk?.addEventListener('click', () => steng());
  felt.addEventListener('input', kjor);
  // Enter går til første treff
  panel.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const forste = liste.querySelector('a');
    if (forste) location.href = forste.href;
  });

  document.addEventListener('keydown', (e) => {
    const iFelt = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName));
    if (e.key === '/' && !iFelt && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); apne(); }
    else if (e.key === 'Escape' && !panel.hidden) steng();
    else if (e.key === 'ArrowDown' && e.target === felt) { e.preventDefault(); liste.querySelector('a')?.focus(); }
  });

  // Klikk utenfor panelet lukker det
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !knapp.contains(e.target)) steng(false);
  });
}

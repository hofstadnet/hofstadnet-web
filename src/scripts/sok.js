// Reservesiden /sok/. Brukes når søkefeltet i menyen ikke er tilgjengelig, av søket på 404-siden og av
// søkefeltet i Google-treffet (strukturert data). Leser ?q= fra adressen.
import { sok, treffliste } from './sok-motor.js';

const skjema = document.querySelector('[data-sok]');
const felt = document.getElementById('sok-felt');
const status = document.querySelector('[data-sok-status]');
const liste = document.querySelector('[data-sok-treff]');

let teller = 0;
async function kjor(ord) {
  const denne = ++teller;
  const q = ord.trim();
  const url = new URL(location.href);
  if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
  history.replaceState(null, '', url);

  if (!q) { liste.replaceChildren(); status.textContent = ''; return; }
  status.textContent = 'Søker …';
  try {
    const svar = await sok(q);
    if (svar === null || denne !== teller) return;
    liste.replaceChildren(...treffliste(svar.treff));
    status.textContent = svar.antall === 0 ? `Ingen treff for «${q}».` : `${svar.antall} treff for «${q}».`;
  } catch {
    status.textContent = 'Søket er ikke tilgjengelig akkurat nå.';
  }
}

if (skjema && felt && status && liste) {
  skjema.addEventListener('submit', (e) => { e.preventDefault(); kjor(felt.value); });
  felt.addEventListener('input', () => kjor(felt.value));
  const fraAdresse = new URLSearchParams(location.search).get('q');
  if (fraAdresse) { felt.value = fraAdresse; kjor(fraAdresse); }
}

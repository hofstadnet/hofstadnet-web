// Oppdaterer statuskortet på forsiden fra sidens egen statustjeneste (/api/status).
// Uten JavaScript, eller hvis tjenesten ikke svarer, står kortet med en nøytral tekst og lenken til kartet.
import { strings } from '../i18n/client';

const card = document.querySelector('[data-flight-status]');
const text = strings();

// Statusen bygger bare på om sporingen hos LiveTrack24 er slått på. Teksten sier derfor hva som er kjent
// (sporing aktiv eller ikke), og når det sist ble sjekket. Tekstene står i src/i18n/nb.ts og en.ts.
const texts = { live: text.status.live, 'not-live': text.status['not-live'], unknown: text.status.unknown };
const clock = new Intl.DateTimeFormat(text.locale, { hour: '2-digit', minute: '2-digit' });

async function update() {
  if (!card || document.hidden) return;
  let status = 'unknown';
  let checked = null;
  try {
    const response = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      if (data && Object.hasOwn(texts, data.status)) status = data.status;
      const t = data && typeof data.checked === 'string' ? new Date(data.checked) : null;
      if (t && !Number.isNaN(t.valueOf())) checked = t;
    }
  } catch {
    // Behold «unknown»
  }
  card.dataset.flightStatus = status;
  card.querySelector('[data-status-text]').textContent = texts[status][0];
  const detail = status !== 'unknown' && checked ? `${texts[status][1]} ${text.status.checked(clock.format(checked))}` : texts[status][1];
  card.querySelector('[data-status-detail]').textContent = detail;
}

if (card) {
  update();
  setInterval(update, 120000);
  document.addEventListener('visibilitychange', update);
}

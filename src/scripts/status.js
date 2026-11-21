// Oppdaterer statuskortet på forsiden fra sidens egen statustjeneste (/api/status).
// Uten JavaScript, eller hvis tjenesten ikke svarer, står kortet med en nøytral tekst og lenken til kartet.
const kort = document.querySelector('[data-flystatus]');

const tekster = {
  live: ['I lufta nå', 'Sporingen er aktiv. Følg turen på kartet.'],
  'ikke-live': ['På bakken', 'Ingen aktiv sporing akkurat nå.'],
  ukjent: ['Status utilgjengelig', 'Åpne kartet for å se siste tur.'],
};

async function oppdater() {
  if (!kort || document.hidden) return;
  let status = 'ukjent';
  try {
    const svar = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (svar.ok) {
      const data = await svar.json();
      if (data && Object.hasOwn(tekster, data.status)) status = data.status;
    }
  } catch {
    // Behold «ukjent»
  }
  kort.dataset.flystatus = status;
  kort.querySelector('[data-status-tekst]').textContent = tekster[status][0];
  kort.querySelector('[data-status-detalj]').textContent = tekster[status][1];
}

if (kort) {
  oppdater();
  setInterval(oppdater, 120000);
  document.addEventListener('visibilitychange', oppdater);
}

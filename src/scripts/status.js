// Oppdaterer statuskortet på forsiden fra sidens egen statustjeneste (/api/status).
// Uten JavaScript, eller hvis tjenesten ikke svarer, står kortet med en nøytral tekst og lenken til kartet.
const kort = document.querySelector('[data-flystatus]');

// Statusen bygger bare på om sporingen hos LiveTrack24 er slått på. Teksten sier derfor hva som er kjent
// (sporing aktiv eller ikke), og når det sist ble sjekket.
const tekster = {
  live: ['I lufta nå', 'Sporingen på LiveTrack24 er aktiv.'],
  'ikke-live': ['Ingen aktiv sporing', 'Jeg er trolig på bakken.'],
  ukjent: ['Status utilgjengelig', 'Åpne kartet for å se siste tur.'],
};
const klokke = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });

async function oppdater() {
  if (!kort || document.hidden) return;
  let status = 'ukjent';
  let sjekket = null;
  try {
    const svar = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (svar.ok) {
      const data = await svar.json();
      if (data && Object.hasOwn(tekster, data.status)) status = data.status;
      const t = data && typeof data.sjekket === 'string' ? new Date(data.sjekket) : null;
      if (t && !Number.isNaN(t.valueOf())) sjekket = t;
    }
  } catch {
    // Behold «ukjent»
  }
  kort.dataset.flystatus = status;
  kort.querySelector('[data-status-tekst]').textContent = tekster[status][0];
  const detalj = status !== 'ukjent' && sjekket ? `${tekster[status][1]} Sjekket kl. ${klokke.format(sjekket)}.` : tekster[status][1];
  kort.querySelector('[data-status-detalj]').textContent = detalj;
}

if (kort) {
  oppdater();
  setInterval(oppdater, 120000);
  document.addEventListener('visibilitychange', oppdater);
}

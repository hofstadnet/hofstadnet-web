// Kjøres før siden tegnes, slik at riktig lys/mørk visning gjelder fra første bilde.
// Rekkefølge: valget fra bryteren (lagret lokalt i nettleseren), ellers innstillingen i operativsystemet,
// ellers mørk (data-theme="dark" på <html>). Valget sendes ikke til noen.
(function () {
  var valg = null;
  try { valg = localStorage.getItem('hofstadnet-color-mode'); } catch (e) {}
  if (valg !== 'light' && valg !== 'dark') {
    valg = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = valg;
})();

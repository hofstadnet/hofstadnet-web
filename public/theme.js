// Kjøres før siden tegnes, slik at riktig lys/mørk visning gjelder fra første bilde.
// Rekkefølge: valget fra bryteren (lagret lokalt i nettleseren), ellers innstillingen i operativsystemet,
// ellers mørk (data-theme="dark" på <html>). Valget sendes ikke til noen.
(function () {
  var mode = null;
  try { mode = localStorage.getItem('hofstadnet-color-mode'); } catch (e) {}
  if (mode !== 'light' && mode !== 'dark') {
    mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = mode;
})();

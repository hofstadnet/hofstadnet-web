// Kjøres før siden tegnes, slik at riktig lys/mørk visning gjelder fra første bilde.
// Mørk visning er standard. Bare valget fra bryteren (lagret lokalt i nettleseren) gir lys visning;
// innstillingen i operativsystemet brukes ikke. Valget sendes ikke til noen.
(function () {
  var mode = null;
  try { mode = localStorage.getItem('hofstadnet-color-mode'); } catch (e) {}
  document.documentElement.dataset.theme = mode === 'light' ? 'light' : 'dark';
})();

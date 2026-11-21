// Kjøres før siden tegnes, slik at lagret valg av lys/mørk visning gjelder fra første bilde.
// Standard er mørk (data-theme="dark" på <html>). Valget lagres bare lokalt i nettleseren.
(function () {
  try {
    var valg = localStorage.getItem('hofstadnet-color-mode');
    if (valg === 'light' || valg === 'dark') document.documentElement.dataset.theme = valg;
  } catch (e) {}
})();

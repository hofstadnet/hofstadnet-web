// Lenker i innleggsteksten som peker ut av siden, åpnes i ny fane.
// Lenker i menyer og kort har dette satt direkte i HTML-en. Denne dekker lenker skrevet i Markdown.
for (const a of document.querySelectorAll('.post a[href^="http"]')) {
  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
}

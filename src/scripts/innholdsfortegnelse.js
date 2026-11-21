// Markerer i innholdsfortegnelsen hvilken del av innlegget som leses (aria-current på lenken).
// Uten dette skriptet virker fortegnelsen som vanlige lenker.
const lenker = [...document.querySelectorAll('[data-toc-lenke]')];

if (lenker.length > 0 && 'IntersectionObserver' in window) {
  const overskrifter = lenker
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((h) => h !== null);

  const marker = (id) => {
    for (const a of lenker) {
      if (decodeURIComponent(a.hash.slice(1)) === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };

  // Den siste overskriften som har passert øvre del av skjermen, er den som leses.
  const oppdater = () => {
    let aktiv = overskrifter[0];
    for (const h of overskrifter) {
      if (h.getBoundingClientRect().top <= window.innerHeight * 0.3) aktiv = h;
    }
    if (aktiv) marker(aktiv.id);
  };

  const observator = new IntersectionObserver(oppdater, { rootMargin: '0px 0px -70% 0px' });
  overskrifter.forEach((h) => observator.observe(h));
  oppdater();
}

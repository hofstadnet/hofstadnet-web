// Markerer i innholdsfortegnelsen hvilken del av innlegget som leses (aria-current på lenken).
// Uten dette skriptet virker fortegnelsen som vanlige lenker.
const links = [...document.querySelectorAll('[data-toc-link]')];

if (links.length > 0 && 'IntersectionObserver' in window) {
  const headings = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((h) => h !== null);

  const mark = (id) => {
    for (const a of links) {
      if (decodeURIComponent(a.hash.slice(1)) === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };

  // Den siste overskriften som har passert øvre del av skjermen, er den som leses.
  const update = () => {
    let active = headings[0];
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= window.innerHeight * 0.3) active = h;
    }
    if (active) mark(active.id);
  };

  const observer = new IntersectionObserver(update, { rootMargin: '0px 0px -70% 0px' });
  headings.forEach((h) => observer.observe(h));
  update();
}

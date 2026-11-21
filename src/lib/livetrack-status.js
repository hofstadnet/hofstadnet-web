// Leser LiveTrack24 sin statusrute og avgjør om sporingen er aktiv.
// Brukes av statustjenesten (worker/index.js) og av den lokale forhåndsvisningen.
//
// Statusruten er en liten HTML-side. Når sporingen ikke er aktiv, inneholder den teksten
// «is not live» og ikonet icon_user_not_live. Aktiv sporing godtas bare med en entydig markør
// («is live» eller icon_user_live). Alt annet gir «ukjent» i stedet for en gjetning, og svaret
// logges (Workers Logs), så formatet kan sjekkes og parseren rettes hvis LiveTrack24 endrer siden.

export const BRUKER = 'krishofs';
export const KILDE = `https://www.livetrack24.com/user/${BRUKER}/status/map/1`;
export const KART = `https://www.livetrack24.com/user/${BRUKER}/2d`;

/** @param {string} html @returns {'live' | 'ikke-live' | 'ukjent'} */
export function tolkStatus(html) {
  if (typeof html !== 'string' || !html.toLowerCase().includes(BRUKER)) return 'ukjent';
  if (/is not live|icon_user_not_live/i.test(html)) return 'ikke-live';
  if (/\bis live\b|\bicon_user_live\b/i.test(html)) return 'live';
  return 'ukjent';
}

/** @param {typeof fetch} hent @returns {Promise<{status: 'live' | 'ikke-live' | 'ukjent', sjekket: string}>} */
export async function hentStatus(hent) {
  let status = 'ukjent';
  try {
    const svar = await hent(KILDE, {
      headers: { 'User-Agent': 'hofstad.net statussjekk', Accept: 'text/html' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (svar.ok) {
      const html = (await svar.text()).slice(0, 20000);
      status = tolkStatus(html);
      if (status === 'ukjent') console.warn('LiveTrack24: ukjent svarformat', html.slice(0, 600));
    } else {
      console.warn('LiveTrack24: HTTP', svar.status);
    }
  } catch (feil) {
    // Nettverksfeil eller tidsavbrudd gir «ukjent»
    console.warn('LiveTrack24: ingen svar', String(feil));
  }
  return { status, sjekket: new Date().toISOString() };
}

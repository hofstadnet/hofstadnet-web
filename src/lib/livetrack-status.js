// Leser LiveTrack24 sin statusrute og avgjør om sporingen er aktiv.
// Brukes av statustjenesten (worker/index.js) og av den lokale forhåndsvisningen.
//
// Statusruten er en liten HTML-side. Når sporingen ikke er aktiv, inneholder den teksten
// «is not live» og ikonet icon_user_not_live. Aktiv sporing godtas bare med en entydig markør
// («is live» eller icon_user_live). Alt annet gir «unknown» i stedet for en gjetning, og svaret
// logges (Workers Logs), så formatet kan sjekkes og parseren rettes hvis LiveTrack24 endrer siden.

export const USER = 'krishofs';
export const SOURCE = `https://www.livetrack24.com/user/${USER}/status/map/1`;
export const MAP = `https://www.livetrack24.com/user/${USER}/2d`;

/** @param {string} html @returns {'live' | 'not-live' | 'unknown'} */
export function parseStatus(html) {
  if (typeof html !== 'string' || !html.toLowerCase().includes(USER)) return 'unknown';
  if (/is not live|icon_user_not_live/i.test(html)) return 'not-live';
  if (/\bis live\b|\bicon_user_live\b/i.test(html)) return 'live';
  return 'unknown';
}

/** @param {typeof fetch} fetchFn @returns {Promise<{status: 'live' | 'not-live' | 'unknown', checked: string}>} */
export async function fetchStatus(fetchFn) {
  let status = 'unknown';
  try {
    const response = await fetchFn(SOURCE, {
      headers: { 'User-Agent': 'hofstad.net statussjekk', Accept: 'text/html' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (response.ok) {
      const html = (await response.text()).slice(0, 20000);
      status = parseStatus(html);
      if (status === 'unknown') console.warn('LiveTrack24: ukjent svarformat', html.slice(0, 600));
    } else {
      console.warn('LiveTrack24: HTTP', response.status);
    }
  } catch (error) {
    // Nettverksfeil eller tidsavbrudd gir «unknown»
    console.warn('LiveTrack24: ingen svar', String(error));
  }
  return { status, checked: new Date().toISOString() };
}

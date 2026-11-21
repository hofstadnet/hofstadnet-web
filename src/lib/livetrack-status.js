// Leser LiveTrack24 sin statusrute og avgjør om sporingen er aktiv.
// Brukes av statustjenesten (functions/api/status.js) og av den lokale forhåndsvisningen.
//
// Statusruten er en liten HTML-side. Når sporingen ikke er aktiv, inneholder den teksten
// «is not live» og ikonet icon_user_not_live. Alt annet som nevner brukeren, regnes som aktiv sporing.
// Svar vi ikke kjenner igjen, gir «ukjent» i stedet for en gjetning.

export const BRUKER = 'krishofs';
export const KILDE = `https://www.livetrack24.com/user/${BRUKER}/status/map/1`;
export const KART = `https://www.livetrack24.com/user/${BRUKER}/2d`;

/** @param {string} html @returns {'live' | 'ikke-live' | 'ukjent'} */
export function tolkStatus(html) {
  if (typeof html !== 'string' || !html.toLowerCase().includes(BRUKER)) return 'ukjent';
  if (/is not live|icon_user_not_live/i.test(html)) return 'ikke-live';
  if (/is live|icon_user_live|<img|<iframe|map/i.test(html)) return 'live';
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
    if (svar.ok) status = tolkStatus((await svar.text()).slice(0, 20000));
  } catch {
    // Nettverksfeil eller tidsavbrudd gir «ukjent»
  }
  return { status, sjekket: new Date().toISOString() };
}

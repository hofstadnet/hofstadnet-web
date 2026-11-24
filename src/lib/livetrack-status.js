// Leser LiveTrack24 sin statusrute og avgjør om sporingen er aktiv.
// Brukes av statustjenesten (worker/index.js) og av den lokale forhåndsvisningen.
//
// Statusruten er en liten HTML-side. Når sporingen ikke er aktiv, inneholder den teksten
// «is not live» og ikonet icon_user_not_live. Aktiv sporing godtas bare med en entydig markør
// («is live» eller icon_user_live). Alt annet gir «unknown» i stedet for en gjetning.
//
// Bare de første 20 kB av svaret leses. Loggene (Workers Logs) har en fast årsakskode og lengden på svaret, aldri
// innholdet. Endrer LiveTrack24 siden, åpnes SOURCE i en nettleser for å se det nye formatet.

export const USER = 'krishofs';
export const SOURCE = `https://www.livetrack24.com/user/${USER}/status/map/1`;
export const MAP = `https://www.livetrack24.com/user/${USER}/2d`;

const MAX_BYTES = 20000;

/**
 * Leser høyst maxBytes av svaret og avbryter resten.
 * @param {Response} response @param {number} maxBytes @returns {Promise<string>}
 */
export async function readPrefix(response, maxBytes = MAX_BYTES) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    const part = value.subarray(0, maxBytes - total);
    total += part.byteLength;
    text += decoder.decode(part, { stream: true });
  }
  await reader.cancel();
  return text + decoder.decode();
}

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
      const html = await readPrefix(response);
      status = parseStatus(html);
      if (status === 'unknown') {
        const reason = html.toLowerCase().includes(USER) ? 'unknown-format' : 'user-missing';
        console.warn('LiveTrack24:', reason, `(${html.length} tegn)`);
      }
    } else {
      console.warn('LiveTrack24: http-error', response.status);
    }
  } catch (error) {
    // Nettverksfeil eller tidsavbrudd gir «unknown». Bare navnet på feilen logges.
    console.warn('LiveTrack24: no-response', error instanceof Error ? error.name : 'Error');
  }
  return { status, checked: new Date().toISOString() };
}

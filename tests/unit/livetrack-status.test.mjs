// Enhetstester for tolkingen av LiveTrack24 sin statusrute (src/lib/livetrack-status.js).
// Kjøres med «npm run test:unit» (Node sin innebygde testkjører), uten nettverk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus, fetchStatus, USER, SOURCE } from '../../src/lib/livetrack-status.js';

const page = (body) => `<html><body><a href="/user/${USER}">${USER}</a> ${body}</body></html>`;

test('ikke aktiv sporing gir not-live', () => {
  assert.equal(parseStatus(page('is not live')), 'not-live');
  assert.equal(parseStatus(page('<img src="/img/icon_user_not_live.png">')), 'not-live');
});

test('aktiv sporing gir live bare med entydig markør', () => {
  assert.equal(parseStatus(page('is live')), 'live');
  assert.equal(parseStatus(page('<img src="/img/icon_user_live.png">')), 'live');
  assert.equal(parseStatus(page('IS LIVE')), 'live');
});

test('«not live» vinner over «live» når begge finnes', () => {
  assert.equal(parseStatus(page('is not live, but the map is live')), 'not-live');
});

test('ukjent eller tomt svar gir unknown i stedet for en gjetning', () => {
  assert.equal(parseStatus(page('Velkommen')), 'unknown');
  assert.equal(parseStatus(''), 'unknown');
  assert.equal(parseStatus(undefined), 'unknown');
  // «delivered» inneholder «live», men er ikke en markør
  assert.equal(parseStatus(page('delivered')), 'unknown');
});

test('svar som ikke gjelder piloten, gir unknown', () => {
  assert.equal(parseStatus('<html>is live</html>'), 'unknown');
});

function fakeFetch(response) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  return Object.assign(fn, { calls });
}

test('fetchStatus henter bare den faste adressen og returnerer tidspunkt', async () => {
  const fetchFn = fakeFetch(new Response(page('is not live'), { status: 200 }));
  const result = await fetchStatus(fetchFn);
  assert.equal(result.status, 'not-live');
  assert.ok(!Number.isNaN(Date.parse(result.checked)));
  assert.equal(fetchFn.calls.length, 1);
  assert.equal(fetchFn.calls[0].url, SOURCE);
});

test('fetchStatus gir unknown ved HTTP-feil, nettverksfeil og tidsavbrudd', async (t) => {
  t.mock.method(console, 'warn', () => {});
  assert.equal((await fetchStatus(fakeFetch(new Response('', { status: 503 })))).status, 'unknown');
  assert.equal((await fetchStatus(fakeFetch(new TypeError('fetch failed')))).status, 'unknown');
  assert.equal((await fetchStatus(fakeFetch(new DOMException('timeout', 'TimeoutError')))).status, 'unknown');
});

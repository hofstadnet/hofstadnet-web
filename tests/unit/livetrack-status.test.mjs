// Enhetstester for tolkingen av LiveTrack24 sin statusrute (src/lib/livetrack-status.js).
// Kjøres med «npm run test:unit» (Node sin innebygde testkjører), uten nettverk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus, fetchStatus, readPrefix, USER, SOURCE } from '../../src/lib/livetrack-status.js';

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

test('readPrefix leser bare starten av svaret og avbryter resten', async () => {
  let pulled = 0;
  let cancelled = false;
  const chunk = new TextEncoder().encode('a'.repeat(8000));
  const body = new ReadableStream({
    pull(controller) { pulled++; controller.enqueue(chunk); },
    cancel() { cancelled = true; },
  });
  const text = await readPrefix(new Response(body), 20000);
  assert.equal(text.length, 20000);
  assert.ok(pulled <= 4, `leste ${pulled} biter`);
  assert.ok(cancelled);
  assert.equal(await readPrefix(new Response('kort')), 'kort');
});

test('ukjent svar logges med årsakskode, aldri med innholdet', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const secret = 'hemmelig-innhold-fra-siden';
  await fetchStatus(fakeFetch(new Response(page(`noe annet ${secret}`), { status: 200 })));
  await fetchStatus(fakeFetch(new Response(`<p>${secret}</p>`, { status: 200 })));
  await fetchStatus(fakeFetch(new TypeError(`fetch failed ${secret}`)));
  const logged = warn.mock.calls.map((c) => c.arguments.join(' '));
  assert.match(logged[0], /unknown-format/);
  assert.match(logged[1], /user-missing/);
  assert.match(logged[2], /no-response TypeError/);
  for (const line of logged) assert.ok(!line.includes(secret), line);
});

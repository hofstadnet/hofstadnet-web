// Enhetstester for logglinjene i Workeren (worker/index.js): én linje per kall, uten personopplysninger.
// Kjøres med «npm run test:unit», uten nettverk. Kallet til LiveTrack24 og mellomlageret erstattes i testen.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { logLine } from '../../worker/index.js';
import { USER } from '../../src/lib/livetrack-status.js';

const ctx = { waitUntil() {} };
const IP = '203.0.113.7';
const AGENT = 'Mozilla/5.0 (test-agent)';
let lines;
let errors;
const original = { log: console.log, error: console.error, warn: console.warn, fetch: globalThis.fetch, caches: globalThis.caches };

beforeEach(() => {
  lines = [];
  errors = [];
  console.log = (line) => lines.push(String(line));
  console.error = (line) => errors.push(String(line));
  console.warn = () => {};
  globalThis.fetch = async () => new Response(`<a href="/user/${USER}">${USER}</a> is not live`);
  delete globalThis.caches;
});

afterEach(() => {
  Object.assign(console, { log: original.log, error: original.error, warn: original.warn });
  globalThis.fetch = original.fetch;
  if (original.caches) globalThis.caches = original.caches;
});

// Forespørsel med de opplysningene som aldri skal havne i loggen
function request(path, init = {}) {
  return new Request(`https://hofstad.net${path}`, {
    ...init,
    headers: { 'CF-Connecting-IP': IP, 'User-Agent': AGENT, ...init.headers },
  });
}

function assertClean(line) {
  for (const secret of [IP, AGENT, 'hemmelig', 'q=']) assert.ok(!line.includes(secret), `«${secret}» i «${line}»`);
}

test('logLine lager én linje med faste nøkler og hopper over tomme verdier', () => {
  assert.equal(logLine({ path: '/api/csp', status: 204, reports: 2, cache: undefined }), 'api path=/api/csp status=204 reports=2');
});

test('/api/status logger status, resultat og mellomlager', async () => {
  const response = await worker.fetch(request('/api/status?q=hemmelig'), {}, ctx);
  assert.equal(response.status, 200);
  assert.deepEqual(lines, ['api path=/api/status status=200 result=not-live cache=none']);
  assertClean(lines[0]);
});

test('/api/status fra mellomlageret logger cache=hit', async () => {
  const stored = new Map();
  globalThis.caches = {
    default: {
      match: async (key) => stored.get(key.url)?.clone(),
      put: async (key, value) => { stored.set(key.url, value); },
    },
  };
  await worker.fetch(request('/api/status'), {}, { waitUntil: (p) => p });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await worker.fetch(request('/api/status'), {}, ctx);
  assert.deepEqual(lines, [
    'api path=/api/status status=200 result=not-live cache=miss',
    'api path=/api/status status=200 result=not-live cache=hit',
  ]);
});

test('/api/csp logger antall rapporter, og bruddet med console.error', async () => {
  const body = JSON.stringify([{ type: 'csp-violation', body: {
    documentURL: 'https://hofstad.net/?q=hemmelig', effectiveDirective: 'script-src-elem',
    blockedURL: 'inline', sourceFile: 'https://hofstad.net/_astro/x.js?q=hemmelig', lineNumber: 1,
  } }]);
  const response = await worker.fetch(request('/api/csp', {
    method: 'POST', body, headers: { 'Content-Type': 'application/reports+json' },
  }), {}, ctx);
  assert.equal(response.status, 204);
  assert.deepEqual(lines, ['api path=/api/csp status=204 reports=1']);
  assert.equal(errors.length, 1);
  assertClean(errors[0]);
});

test('ugyldig rapport logger reports=0', async () => {
  await worker.fetch(request('/api/csp', { method: 'POST', body: 'ikke json' }), {}, ctx);
  assert.deepEqual(lines, ['api path=/api/csp status=204 reports=0']);
  assert.equal(errors.length, 0);
});

test('feil metode og ukjent adresse logges uten tekst fra adressen', async () => {
  await worker.fetch(request('/api/csp'), {}, ctx);
  await worker.fetch(request('/api/hemmelig?q=hemmelig'), {}, ctx);
  assert.deepEqual(lines, ['api path=/api/csp status=405', 'api path=other status=404']);
});

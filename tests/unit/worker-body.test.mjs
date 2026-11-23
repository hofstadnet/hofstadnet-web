// Enhetstester for den harde grensen på størrelsen av innkommende data i Workeren (worker/body.js og /api/csp).
// Kjøres med «npm run test:unit», uten nettverk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLimitedBody } from '../../worker/body.js';
import { handleCspReport } from '../../worker/csp-report.js';

// Forespørsel som sendes i biter (chunked), uten Content-Length
function chunked(parts) {
  const stream = new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  });
  return new Request('https://hofstad.net/api/csp', { method: 'POST', body: stream, duplex: 'half' });
}

test('leser hele kroppen under grensen', async () => {
  const body = await readLimitedBody(chunked(['{"a":', '1}']), 100);
  assert.equal(new TextDecoder().decode(body), '{"a":1}');
});

test('stopper ved grensen uten Content-Length', async () => {
  const request = chunked(['a'.repeat(60), 'b'.repeat(60)]);
  assert.equal(request.headers.get('Content-Length'), null);
  assert.equal(await readLimitedBody(request, 100), null);
});

test('godtar kropp på nøyaktig grensen', async () => {
  const body = await readLimitedBody(chunked(['a'.repeat(100)]), 100);
  assert.equal(body.byteLength, 100);
});

test('tom kropp', async () => {
  const body = await readLimitedBody(new Request('https://hofstad.net/api/csp', { method: 'POST' }), 100);
  assert.equal(body.byteLength, 0);
});

test('grensen gjelder byte, ikke tegn', async () => {
  // «ø» er 2 byte i UTF-8
  assert.equal(await readLimitedBody(chunked(['ø'.repeat(60)]), 100), null);
});

test('/api/csp avviser rapporter over 16 kB uten Content-Length', async () => {
  const report = { 'csp-report': { 'document-uri': 'https://hofstad.net/', 'effective-directive': 'img-src', 'blocked-uri': 'https://eksempel.no/x.png' } };
  const errors = [];
  const original = console.error;
  console.error = (line) => errors.push(line);
  try {
    const small = JSON.stringify(report);
    assert.equal(await handleCspReport(chunked([small])), 1);
    const padded = JSON.stringify({ ...report, padding: 'x'.repeat(17 * 1024) });
    assert.equal(await handleCspReport(chunked([padded.slice(0, 9000), padded.slice(9000)])), 0);
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 1);
});

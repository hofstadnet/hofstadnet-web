// Stopper bygget hvis den ferdige siden inneholder innebygd kode som Content-Security-Policy
// i public/_headers ville blokkert: skript uten egen fil, style-attributter eller <style>-blokker.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const funn = [];

async function gaa(mappe) {
  for (const e of await readdir(mappe, { withFileTypes: true })) {
    const sti = join(mappe, e.name);
    if (e.isDirectory()) {
      await gaa(sti);
    } else if (e.name.endsWith('.html')) {
      const html = await readFile(sti, 'utf8');
      // Strukturert data (type="application/ld+json") er data, ikke kode, og kjøres aldri av nettleseren
      if (/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html)) funn.push(`${sti}: skript uten egen fil`);
      if (/\sstyle="/i.test(html)) funn.push(`${sti}: style-attributt`);
      if (/<style[\s>]/i.test(html)) funn.push(`${sti}: <style>-blokk`);
    }
  }
}

await gaa('dist');

if (funn.length > 0) {
  console.error(['Innebygd kode funnet:', ...funn].join('\n'));
  process.exit(1);
}
console.log('Ingen innebygd kode i HTML.');

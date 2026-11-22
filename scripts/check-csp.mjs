// Stopper bygget hvis den ferdige siden inneholder innebygd kode som Content-Security-Policy
// i public/_headers ville blokkert: skript uten egen fil, style-attributter eller <style>-blokker.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const findings = [];

async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(path);
    } else if (e.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      // Strukturert data (type="application/ld+json") er data, ikke kode, og kjøres aldri av nettleseren
      if (/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html)) findings.push(`${path}: skript uten egen fil`);
      if (/\sstyle="/i.test(html)) findings.push(`${path}: style-attributt`);
      if (/<style[\s>]/i.test(html)) findings.push(`${path}: <style>-blokk`);
    }
  }
}

await walk('dist');

if (findings.length > 0) {
  console.error(['Innebygd kode funnet:', ...findings].join('\n'));
  process.exit(1);
}
console.log('Ingen innebygd kode i HTML.');

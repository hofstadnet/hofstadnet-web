// Stopper bygget når security.txt utløper innen 30 dager, eller allerede har utløpt.
// RFC 9116 krever en utløpsdato. En utgått fil betyr at kontaktinformasjonen ikke lenger skal stoles på.
// Fornyes ved å sette Expires i public/.well-known/security.txt til høyst ett år frem.
import { readFile } from 'node:fs/promises';

const FILE = 'public/.well-known/security.txt';
const MIN_DAYS = 30;

const text = await readFile(FILE, 'utf8');
const match = text.match(/^Expires:\s*(.+)$/m);
if (!match) {
  console.error(`${FILE} mangler Expires.`);
  process.exit(1);
}

const expires = new Date(match[1].trim());
const daysLeft = Math.floor((expires.getTime() - Date.now()) / 86_400_000);
if (Number.isNaN(daysLeft)) {
  console.error(`${FILE}: Expires er ikke en gyldig dato (${match[1].trim()}).`);
  process.exit(1);
}
if (daysLeft < MIN_DAYS) {
  console.error(`${FILE} utløper om ${daysLeft} dager. Sett Expires til høyst ett år frem.`);
  process.exit(1);
}
console.log(`security.txt er gyldig i ${daysLeft} dager til.`);

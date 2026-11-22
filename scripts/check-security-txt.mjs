// Stopper bygget når security.txt utløper innen 30 dager, eller allerede har utløpt.
// RFC 9116 krever en utløpsdato. En utgått fil betyr at kontaktinformasjonen ikke lenger skal stoles på.
// Fornyes ved å sette Expires i public/.well-known/security.txt til høyst ett år frem.
import { readFile } from 'node:fs/promises';

const FIL = 'public/.well-known/security.txt';
const DAGER = 30;

const tekst = await readFile(FIL, 'utf8');
const treff = tekst.match(/^Expires:\s*(.+)$/m);
if (!treff) {
  console.error(`${FIL} mangler Expires.`);
  process.exit(1);
}

const utloper = new Date(treff[1].trim());
const igjen = Math.floor((utloper.getTime() - Date.now()) / 86_400_000);
if (Number.isNaN(igjen)) {
  console.error(`${FIL}: Expires er ikke en gyldig dato (${treff[1].trim()}).`);
  process.exit(1);
}
if (igjen < DAGER) {
  console.error(`${FIL} utløper om ${igjen} dager. Sett Expires til høyst ett år frem.`);
  process.exit(1);
}
console.log(`security.txt er gyldig i ${igjen} dager til.`);

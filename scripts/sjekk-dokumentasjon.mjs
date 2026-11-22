// Kontrollerer at dokumentasjonen stemmer med repoet. Kjøres i bygget (ci.yml) og lokalt med
// «node scripts/sjekk-dokumentasjon.mjs». Feiler når:
//  - en sti i `kode` eller en relativ lenke peker på en fil eller mappe som ikke finnes
//  - en lenke til en overskrift (#anker) i et annet dokument ikke finner overskriften
//  - «npm run <navn>» nevner et skript som ikke finnes i package.json
//  - en arbeidsflyt i .github/workflows/ ikke er nevnt i docs/drift.md, eller en nevnt arbeidsflyt ikke finnes
//
// Sjekken fanger ikke opp at en beskrivelse er feil, bare at den peker på noe som ikke finnes. Innholdet holdes
// oppdatert ved gjennomgang i pull requesten (se .claude/skills/dokumentasjon/SKILL.md).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const DOKUMENTER = ['README.md', 'SECURITY.md', 'infra/README.md', ...readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];

// Stier som bare finnes etter bygg, utenfor repoet eller er eksempler i teksten
const IKKE_I_REPOET = [
  /^dist(\/|$)/, /^node_modules/, /^playwright-rapport/, /^lighthouse-rapport/, /^\.terraform\//,
  /^hofstad\.net\/terraform\.tfstate$/, // nøkkelen til state i R2
  /^hofstadnet\/status$/, // et annet repo
  /^mitt-innlegg\.md$/, /^importer\.tf$/, // eksempler
];
// Mapper en sti også kan være relativ til
const MAPPER = ['', 'public', 'public/.well-known', 'infra', 'infra/hofstad.net', '.github/workflows'];

const feil = [];
const skript = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts);
const arbeidsflyter = readdirSync('.github/workflows').filter((f) => f.endsWith('.yml'));

// GitHub sin måte å lage anker av en overskrift på
const anker = (tekst) => tekst.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
function ankere(fil) {
  return new Set([...readFileSync(fil, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => anker(m[1])));
}

function ligner(sti) {
  if (/\s|[<>*…|{}$=]|^\.\.\.|^https?:|^\//.test(sti)) return false;
  return /\//.test(sti) || /\.(md|mjs|js|ts|astro|json|jsonc|toml|yml|tf|tfvars|hcl|css|txt)$/.test(sti);
}

for (const dok of DOKUMENTER) {
  const tekst = readFileSync(dok, 'utf8');
  const uten = tekst.replace(/```[\s\S]*?```/g, '');
  const mappe = dirname(dok);

  for (const [, sti] of uten.matchAll(/`([^`\n]+)`/g)) {
    if (!ligner(sti) || IKKE_I_REPOET.some((r) => r.test(sti))) continue;
    const kandidater = [join(mappe, sti), ...MAPPER.map((m) => join(m, sti))];
    if (!kandidater.some((k) => existsSync(normalize(k)))) feil.push(`${dok}: \`${sti}\` finnes ikke`);
  }

  for (const [, lenke] of uten.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:)/.test(lenke)) continue;
    const [sti, del] = lenke.split('#');
    const mal = sti ? normalize(join(mappe, sti)) : dok;
    if (!existsSync(mal)) { feil.push(`${dok}: lenken ${lenke} peker på noe som ikke finnes`); continue; }
    if (del && mal.endsWith('.md') && !ankere(mal).has(decodeURIComponent(del))) feil.push(`${dok}: lenken ${lenke} finner ikke overskriften`);
  }

  for (const [, navn] of tekst.matchAll(/npm run ([\w:-]+)/g)) {
    if (!skript.includes(navn)) feil.push(`${dok}: «npm run ${navn}» finnes ikke i package.json`);
  }

  for (const [, fil] of uten.matchAll(/`([\w.-]+\.yml)`/g)) {
    if (!arbeidsflyter.includes(fil) && !existsSync(fil) && !existsSync(join(mappe, fil))) feil.push(`${dok}: arbeidsflyten ${fil} finnes ikke`);
  }
}

const drift = readFileSync('docs/drift.md', 'utf8');
for (const fil of arbeidsflyter) {
  if (!drift.includes(fil)) feil.push(`docs/drift.md: arbeidsflyten ${fil} er ikke beskrevet`);
}

if (feil.length) {
  console.error(`Dokumentasjonen stemmer ikke med repoet (${feil.length}):\n  ${feil.join('\n  ')}`);
  process.exit(1);
}
console.log(`Dokumentasjonen stemmer med repoet (${DOKUMENTER.length} dokumenter, ${arbeidsflyter.length} arbeidsflyter).`);

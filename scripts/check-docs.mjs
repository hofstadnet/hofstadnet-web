// Kontrollerer at dokumentasjonen stemmer med repoet. Kjøres i bygget (ci.yml) og lokalt med
// «node scripts/check-docs.mjs». Feiler når:
//  - en sti i `kode` eller en relativ lenke peker på en fil eller mappe som ikke finnes
//  - en lenke til en overskrift (#anker) i et annet dokument ikke finner overskriften
//  - «npm run <navn>» nevner et skript som ikke finnes i package.json
//  - en arbeidsflyt i .github/workflows/ ikke er nevnt i docs/operations.md, eller en nevnt arbeidsflyt ikke finnes
//
// Sjekken fanger ikke opp at en beskrivelse er feil, bare at den peker på noe som ikke finnes. Innholdet holdes
// oppdatert ved gjennomgang i pull requesten (se docs/guidelines/documentation.md).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';

const DOCUMENTS = ['README.md', 'AGENTS.md', 'SECURITY.md', 'infra/README.md', ...readdirSync('docs', { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => `docs/${f.split(sep).join('/')}`)];

// Stier som bare finnes etter bygg, utenfor repoet eller er eksempler i teksten
const NOT_IN_REPO = [
  /^dist(\/|$)/, /^node_modules/, /^playwright-report/, /^lighthouse-report/, /^\.terraform\//,
  /^hofstad\.net\/terraform\.tfstate$/, // nøkkelen til state i R2
  /^hofstadnet\/(status|operations)$/, // andre repoer
  /^mitt-innlegg\.md$/, /^importer\.tf$/, // eksempler
  /^actions\//, // GitHub-actions, ikke filer
  /^@[\w.-]+\/[\w.-]+$/, // npm-pakker med scope, f.eks. @astrojs/compiler-binding
];
// Mapper en sti også kan være relativ til
const BASE_DIRS = ['', 'public', 'public/.well-known', 'infra', 'infra/hofstad.net', '.github/workflows'];

const errors = [];
const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts);
const workflows = readdirSync('.github/workflows').filter((f) => f.endsWith('.yml'));

// GitHub sin måte å lage anker av en overskrift på
const anchor = (text) => text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
function anchors(file) {
  return new Set([...readFileSync(file, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => anchor(m[1])));
}

function looksLikePath(path) {
  if (/\s|[<>*…|{}$=]|^\.\.\.|^https?:|^\//.test(path)) return false;
  return /\//.test(path) || /\.(md|mjs|js|ts|astro|json|jsonc|toml|yml|tf|tfvars|hcl|css|txt)$/.test(path);
}

for (const doc of DOCUMENTS) {
  const text = readFileSync(doc, 'utf8');
  const withoutCode = text.replace(/```[\s\S]*?```/g, '');
  const dir = dirname(doc);

  for (const [, path] of withoutCode.matchAll(/`([^`\n]+)`/g)) {
    if (!looksLikePath(path) || NOT_IN_REPO.some((r) => r.test(path))) continue;
    const candidates = [join(dir, path), ...BASE_DIRS.map((m) => join(m, path))];
    if (!candidates.some((c) => existsSync(normalize(c)))) errors.push(`${doc}: \`${path}\` finnes ikke`);
  }

  for (const [, link] of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [path, fragment] = link.split('#');
    const target = path ? normalize(join(dir, path)) : doc;
    if (!existsSync(target)) { errors.push(`${doc}: lenken ${link} peker på noe som ikke finnes`); continue; }
    if (fragment && target.endsWith('.md') && !anchors(target).has(decodeURIComponent(fragment))) errors.push(`${doc}: lenken ${link} finner ikke overskriften`);
  }

  for (const [, name] of text.matchAll(/npm run ([\w:-]+)/g)) {
    if (!scripts.includes(name)) errors.push(`${doc}: «npm run ${name}» finnes ikke i package.json`);
  }

  for (const [, file] of withoutCode.matchAll(/`([\w.-]+\.yml)`/g)) {
    if (!workflows.includes(file) && !existsSync(file) && !existsSync(join(dir, file))) errors.push(`${doc}: arbeidsflyten ${file} finnes ikke`);
  }
}

const operations = readFileSync('docs/operations.md', 'utf8');
for (const file of workflows) {
  if (!operations.includes(file)) errors.push(`docs/operations.md: arbeidsflyten ${file} er ikke beskrevet`);
}

if (errors.length) {
  console.error(`Dokumentasjonen stemmer ikke med repoet (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`Dokumentasjonen stemmer med repoet (${DOCUMENTS.length} dokumenter, ${workflows.length} arbeidsflyter).`);

import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const assets = join(dist, 'assets');
const HOME_BUDGET_KB = 200;

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entry = /src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];
if (!entry) throw new Error('Entry script not found in dist/index.html');

const read = (name) => readFileSync(join(assets, name), 'utf8');

/** Chunks loaded eagerly: static imports only, dynamic import() is excluded. */
function staticGraph(start) {
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const match of read(name).matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g))
      visit(match[1]);
  };
  visit(start);
  return seen;
}

const files = readdirSync(assets).filter((name) => name.endsWith('.js'));
const chunk = (prefix) => files.find((name) => name.startsWith(`${prefix}-`));
const failures = [];

for (const [label, start] of [
  ['entry', entry],
  ['ProductPage', chunk('ProductPage')],
  ['HomePage', chunk('HomePage')],
]) {
  if (!start) continue;
  for (const name of staticGraph(start)) {
    if (/WebGLRenderer/.test(read(name)))
      failures.push(`${label} statically loads three.js via ${name}`);
  }
}

const homeFiles = new Set([...staticGraph(entry), ...staticGraph(chunk('HomePage') ?? entry)]);
const homeKb = [...homeFiles].reduce((sum, name) => sum + gzipSync(read(name)).length, 0) / 1024;
console.log(`Home page initial JS: ${homeKb.toFixed(1)} KB gzip (budget ${HOME_BUDGET_KB} KB)`);
if (homeKb > HOME_BUDGET_KB) failures.push(`Home page JS is ${homeKb.toFixed(1)} KB gzip`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Bundle check passed: three.js is only in the lazy 3D chunk.');

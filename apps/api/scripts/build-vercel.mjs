import { build } from 'esbuild';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

// Serverless bundles have no migrations folder on disk, so the SQL is embedded.
const embedMigrations = {
  name: 'embed-migrations',
  setup(b) {
    b.onResolve({ filter: /^virtual:migrations$/ }, () => ({
      path: 'migrations',
      namespace: 'embedded-migrations',
    }));
    b.onLoad({ filter: /.*/, namespace: 'embedded-migrations' }, () => {
      const files = readdirSync(migrationsDir)
        .filter((name) => name.endsWith('.sql'))
        .sort();
      const entries = files.map((name) => {
        const content = readFileSync(`${migrationsDir}${name}`, 'utf8');
        const up = content
          .slice(content.indexOf('-- Up Migration') + '-- Up Migration'.length)
          .split('-- Down Migration')[0]
          .trim();
        return { name, up };
      });
      return { contents: `export default ${JSON.stringify(entries)};`, loader: 'js' };
    });
  },
};

await build({
  entryPoints: [fileURLToPath(new URL('../src/vercel.ts', import.meta.url))],
  outfile: `${root}api/index.js`,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  plugins: [embedMigrations],
  // Native or optional modules stay external; sharp is installed at the repo root for tracing.
  external: ['sharp', 'pg-native', '@electric-sql/pglite'],
  footer: { js: 'module.exports = module.exports.default;' },
  logLevel: 'info',
  // import.meta is only used on code paths that never run in the serverless bundle.
  logOverride: { 'empty-import-meta': 'silent' },
});

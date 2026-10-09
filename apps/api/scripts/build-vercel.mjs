import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));

await build({
  entryPoints: [fileURLToPath(new URL('../src/vercel.ts', import.meta.url))],
  outfile: `${root}api/index.js`,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // Native or optional modules stay external; sharp is installed at the repo root for tracing.
  external: ['sharp', 'pg-native', '@electric-sql/pglite'],
  footer: { js: 'module.exports = module.exports.default;' },
  logLevel: 'info',
});

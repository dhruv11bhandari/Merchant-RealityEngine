import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [join(root, 'http.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(root, 'bundle.js'),
  packages: 'external',
  logLevel: 'silent',
});

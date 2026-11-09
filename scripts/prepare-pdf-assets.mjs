import { copyFile, cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const source = dirname(require.resolve('pdfjs-dist/package.json'));
const { version } = require('pdfjs-dist/package.json');
const destination = new URL(`../public/pdfjs/${version}/`, import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(join(source, 'legacy/build/pdf.worker.min.mjs'), new URL('pdf.worker.min.mjs', destination));
await copyFile(join(source, 'LICENSE'), new URL('LICENSE', destination));
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(join(source, folder), new URL(folder, destination), { recursive: true });
}

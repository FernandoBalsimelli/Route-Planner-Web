import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readPdfManifest } from '../lib/manifest-pdf.ts';
import { pdfPageRange, pdfTextLines } from '../lib/manifest-pdf-text.ts';
import { manifestCandidates } from '../lib/manifest.ts';
import { manifestPdf } from './fixtures/manifest-pdf.mjs';
const file = pages => new File([manifestPdf(pages)], 'manifiesto.pdf', { type: 'application/pdf' });

test('real PDF extraction retains page order and delivery line boundaries', async () => {
  const progress = [];
  const result = await readPdfManifest(file(), message => progress.push(message), new AbortController().signal);
  assert.equal(result.totalPages, 2); assert.deepEqual(result.pages, [1, 2]); assert.deepEqual(result.ocrPages, []);
  assert.ok(result.text.indexOf('Calle Cedro 312') < result.text.indexOf('Avenida Universidad 100'));
  assert.deepEqual(manifestCandidates(result.text), ['Bodega Aurrera Express, Calle Cedro 312, Chihuahua', 'Bodega Aurrera Express, Avenida Universidad 100, Monterrey']);
  assert.ok(progress.some(message => message.includes('página 2 de 2')));
});
test('chosen PDF range does not import addresses from excluded pages', async () => {
  const result = await readPdfManifest(file(), () => {}, new AbortController().signal, { firstPage: 2, lastPage: 2 });
  assert.deepEqual(result.pages, [2]); assert.ok(!result.text.includes('Cedro')); assert.ok(result.text.includes('Universidad 100'));
});
test('PDF limits reject invalid ranges, protected file types and oversized uploads before parsing', async () => {
  assert.deepEqual(pdfPageRange(15, 3, 5), [3, 4, 5]);
  for (const args of [[2, 0, 2], [2, 1, 3], [2, 2, 1], [2, 1.1, 2]]) assert.throws(() => pdfPageRange(...args), /rango válido/);
  assert.throws(() => pdfPageRange(11), /hasta 10 páginas/);
  await assert.rejects(readPdfManifest({ type: 'image/png', name: 'foto.png', size: 50 }, () => {}, new AbortController().signal), /archivo PDF/);
  await assert.rejects(readPdfManifest({ type: 'application/pdf', name: 'grande.pdf', size: 21 * 1024 * 1024 }, () => {}, new AbortController().signal), /20 MB/);
  await assert.rejects(readPdfManifest(file(Array.from({ length: 11 }, () => ['Calle de prueba 123, Chihuahua'])), () => {}, new AbortController().signal), /hasta 10 páginas/);
});
test('cancelled PDF reads do not return partial addresses', async () => {
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(readPdfManifest(file(), () => {}, cancelled.signal), { name: 'AbortError' });
  const pending = new AbortController();
  const work = readPdfManifest(file(), () => {}, pending.signal); pending.abort();
  await assert.rejects(work, { name: 'AbortError' });
});
test('invalid PDFs fail clearly and image-only pages require browser OCR', async () => {
  await assert.rejects(readPdfManifest(new File(['not a PDF'], 'bad.pdf', { type: 'application/pdf' }), () => {}, new AbortController().signal), /PDF válido|dañado/);
  await assert.rejects(readPdfManifest(file([[]]), () => {}, new AbortController().signal), /necesita OCR/);
});
test('PDF layout honors explicit line endings, position changes and spaces between fragments', () => {
  const item = (str, y, hasEOL = false) => ({ str, transform: [1, 0, 0, 1, 20, y], hasEOL });
  assert.equal(pdfTextLines([item('Calle', 100), item('Cedro 312', 100, true), { type: 'beginMarkedContent' }, item('Col. Centro', 80), item('Chihuahua', 60)]), 'Calle Cedro 312\nCol. Centro\nChihuahua');
});

test('adjacent PDF glyph fragments preserve house numbers instead of inventing spaces', () => {
  assert.equal(pdfTextLines([
    { str: 'Calle Cedro', transform: [12, 0, 0, 12, 20, 100], width: 65 },
    { str: '3', transform: [12, 0, 0, 12, 90, 100], width: 6 },
    { str: '12', transform: [12, 0, 0, 12, 96, 100], width: 12, hasEOL: true },
  ]), 'Calle Cedro 312');
});

import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { createWorker } from 'tesseract.js';
assert.ok(process.argv[2], 'Indica la ruta de una imagen de manifiesto para probar el lector.');
const worker = await createWorker('spa', 1, { cachePath: tmpdir() });
try {
  const { data } = await worker.recognize(process.argv[2]);
  assert.ok(data.text.trim(), 'El lector no reconoció texto en la imagen.');
  console.log(JSON.stringify({ recognizedCharacters: data.text.length, confidence: data.confidence }));
} finally { await worker.terminate(); }

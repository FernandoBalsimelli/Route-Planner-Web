import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestCandidates } from '../lib/manifest.ts';
import { vehicleValues } from '../lib/vehicles.ts';
import { scanManifest } from '../lib/manifest-ocr.ts';

test('manifest groups a store and its address without treating headers as deliveries', () => {
  const result = manifestCandidates('Manifiesto: 123\nFecha: 08/11/2026\nBodega Aurrera Express\nCalle Cedro 312\nColonia Centro, Chihuahua\nBodega Aurrerá Express\nAvenida Universidad 100\nCol. Centro, Monterrey');
  assert.deepEqual(result, ['Bodega Aurrera Express, Calle Cedro 312, Colonia Centro, Chihuahua', 'Bodega Aurrerá Express, Avenida Universidad 100, Col. Centro, Monterrey']);
});
test('pasted addresses keep exact numbers, remove duplicates and bound input', () => {
  assert.deepEqual(manifestCandidates('Calle Uno 123, Chihuahua\nCalle Dos 456, Delicias\nCalle Uno 123, Chihuahua'), ['Calle Uno 123, Chihuahua', 'Calle Dos 456, Delicias']);
  assert.equal(manifestCandidates('x'.repeat(1000))[0].length, 180);
});
test('real Spanish OCR output groups the city with its branch and discards the manifest title', () => {
  const text = 'MANIFIESTO DE ENTREGAS\n\nBodega Aurrera Express\n\nCalle Cedro 312, Colonia Centro\nChihuahua, Chihuahua\n\nBodega Aurrera Express\n\nAvenida Universidad 100, Monterrey\n';
  assert.deepEqual(manifestCandidates(text), ['Bodega Aurrera Express, Calle Cedro 312, Colonia Centro, Chihuahua, Chihuahua', 'Bodega Aurrera Express, Avenida Universidad 100, Monterrey']);
});
test('vehicle profiles require valid loaded truck dimensions and do not fabricate car restrictions', () => {
  const dimensions = { height_m: '3.2', width_m: '2.4', length_m: '8', gross_weight_t: '12', axle_weight_t: '6' };
  const truck = vehicleValues(' Unidad 12 ', 'truck', dimensions, 'fleet');
  assert.equal(truck.height_m, 3.2); assert.equal(truck.fleet_id, 'fleet'); assert.equal(truck.name, 'Unidad 12');
  assert.equal(vehicleValues('Automóvil', 'car', {}, '').height_m, null);
  assert.throws(() => vehicleValues('', 'delivery', {}, ''), /nombre/);
  assert.throws(() => vehicleValues('Camión', 'truck', { ...dimensions, gross_weight_t: '101' }, ''), /peso bruto/);
  assert.throws(() => vehicleValues('Camión', 'truck', { ...dimensions, height_m: '' }, ''), /altura/);
});
test('photo validation rejects PDFs and oversized files before loading an OCR worker', async () => {
  await assert.rejects(scanManifest({ type: 'application/pdf', size: 100 }, () => {}, new AbortController().signal), /foto JPG/);
  await assert.rejects(scanManifest({ type: 'image/jpeg', size: 16 * 1024 * 1024 }, () => {}, new AbortController().signal), /15 MB/);
});

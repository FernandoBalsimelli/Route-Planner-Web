import assert from 'node:assert/strict';
import { test } from 'node:test';
import { locateDevice } from '../lib/geolocation.ts';

test('device coordinates retain their precision and request a fresh accurate fix', async () => {
  const point = await locateDevice({ getCurrentPosition(success, error, options) {
    assert.deepEqual(options, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    success({ coords: { latitude: 28.662926123, longitude: -106.099908456, accuracy: 16.4 } });
  } });
  assert.deepEqual(point, { lat: 28.662926123, lng: -106.099908456, accuracyM: 16.4 });
});

for (const [code, expected] of [[1, /permisos/], [2, /Activa la ubicación/], [3, /tardó demasiado/]]) {
  test(`location error ${code} gives a specific recoverable message`, async () => {
    await assert.rejects(locateDevice({ getCurrentPosition(success, error) { error({ code }); } }), expected);
  });
}

test('invalid device coordinates are rejected', async () => {
  await assert.rejects(locateDevice({ getCurrentPosition(success) { success({ coords: { latitude: NaN, longitude: 190, accuracy: 1 } }); } }), /inválida/);
});

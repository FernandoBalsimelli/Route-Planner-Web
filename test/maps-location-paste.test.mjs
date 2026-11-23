import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapsLocationPaste } from '../lib/maps-location-paste.ts';

test('documented Maps search coordinates preserve precision and ignore the camera center', () => {
  const query = '28.635300123,-106.088900456';
  assert.deepEqual(mapsLocationPaste(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&center=25,-100`), { type: 'search', query });
  assert.deepEqual(mapsLocationPaste('https://maps.google.com/?q=%2B28.63%2C%20-106.08'), { type: 'search', query: '28.63,-106.08' });
  assert.deepEqual(mapsLocationPaste('https://www.google.com.mx/maps/search/?api=1&query=0,0'), { type: 'search', query: '0,0' });
});
test('a Plus Code or address remains unconfirmed search text, including an encoded plus sign', () => {
  for (const query of ['75XMRW22+22', 'RW22+22 Chihuahua', 'Bodega Aurrera Express, Calle Cedro 101, Monterrey']) assert.deepEqual(mapsLocationPaste(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`), { type: 'search', query });
});
test('short links, route links, viewport-only links and place ID overrides are not imported as pins', () => {
  for (const link of ['https://maps.app.goo.gl/abc', 'https://goo.gl/maps/abc', 'https://www.google.com/maps/dir/?api=1&origin=28,-106&destination=25,-100', 'https://www.google.com/maps/@28,-106,15z', 'https://www.google.com/maps/?api=1&map_action=map&center=28,-106', 'https://www.google.com/maps/search/?api=1&query=28,-106&query_place_id=ChIJother', 'https://www.google.com/maps/place/Express/@28,-106/data=!3d25!4d-100', 'https://www.google.com/maps/place/Express/?api=1&query=28,-106', 'https://www.google.com/maps/search/?query=28,-106']) assert.equal(mapsLocationPaste(link)?.type, 'unsupported', link);
});
test('unsafe, duplicate and oversized queries cannot become locations or fetch targets', () => {
  for (const link of ['https://www.google.com/maps/search/?api=1&query=28,-106&q=25,-100', 'https://www.google.com/maps/search/?api=1&query=95,180', 'https://www.google.com/maps/search/?api=1&query=', 'https://www.google.com/maps/search/?api=1&query=https%3A%2F%2Fprivate.example', 'https://www.google.com/maps/search/?api=1&query=a%0Ab', 'https://name:pass@www.google.com/maps/?q=28,-106', 'https://www.google.com:1234/maps/?q=28,-106', 'http://www.google.com/maps/?q=28,-106', `https://www.google.com/maps/?api=1&query=${'x'.repeat(181)}`]) assert.equal(mapsLocationPaste(link)?.type, 'unsupported', link);
  for (const text of ['28.63,-106.08', '75XMRW22+22', 'Bodega Aurrera Express', 'https://www.google.com.evil.test/maps/?q=28,-106', 'https://example.test/maps/?q=28,-106', 'https://www.google.com/search?q=tienda', 'javascript:alert(1)']) assert.equal(mapsLocationPaste(text), null);
});
